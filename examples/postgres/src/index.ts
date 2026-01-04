import { Effect, Layer, Console } from "effect";
import { PrismaClient } from "@prisma/client";
import { PrismaLive } from "effect-prisma/runtime";
import { DB } from "../generated/effect/index.js";

const program = Effect.gen(function* () {
  const db = yield* DB;

  yield* Console.log("=== effect-prisma PostgreSQL Example ===\n");

  const orgCount = yield* db.organization.count();
  yield* Console.log(`Organizations: ${orgCount}`);

  const userCount = yield* db.user.count();
  yield* Console.log(`Users: ${userCount}`);

  const projectCount = yield* db.project.count();
  yield* Console.log(`Projects: ${projectCount}`);

  const taskCount = yield* db.task.count();
  yield* Console.log(`Tasks: ${taskCount}\n`);

  yield* Console.log("--- Finding users with their managers ---");
  const users = yield* db.user.findMany({
    include: { manager: true },
    orderBy: { name: "asc" },
  });

  for (const user of users) {
    const managerInfo = user.manager ? ` (reports to ${user.manager.name})` : " (no manager)";
    yield* Console.log(`  ${user.name}${managerInfo}`);
  }

  yield* Console.log("\n--- Active projects with task counts ---");
  const projects = yield* db.project.findMany({
    where: { status: "ACTIVE" },
    include: {
      owner: true,
      team: true,
      _count: { select: { tasks: true } },
    },
  });

  for (const project of projects) {
    yield* Console.log(`  ${project.name}`);
    yield* Console.log(`    Team: ${project.team.name}`);
    yield* Console.log(`    Owner: ${project.owner.name}`);
    yield* Console.log(`    Tasks: ${project._count.tasks}`);
    if (project.budget) {
      yield* Console.log(`    Budget: $${project.budget.toFixed(2)}`);
    }
  }

  yield* Console.log("\n--- High priority tasks ---");
  const highPriorityTasks = yield* db.task.findMany({
    where: {
      priority: { in: ["CRITICAL", "HIGH"] },
    },
    include: {
      assignee: true,
      project: true,
    },
    orderBy: { priority: "asc" },
  });

  for (const task of highPriorityTasks) {
    const assignee = task.assignee?.name ?? "Unassigned";
    yield* Console.log(`  [${task.priority}] ${task.title}`);
    yield* Console.log(`    Project: ${task.project.name}`);
    yield* Console.log(`    Assignee: ${assignee}`);
    yield* Console.log(`    Status: ${task.status}`);
  }

  yield* Console.log("\n--- Time entries summary ---");
  const timeEntries = yield* db.timeEntry.findMany({
    include: { user: true, task: true },
    orderBy: { date: "desc" },
    take: 5,
  });

  let totalHours = 0;
  for (const entry of timeEntries) {
    const hours = Number(entry.hours);
    totalHours += hours;
    yield* Console.log(`  ${entry.user.name}: ${hours}h on "${entry.task.title}"`);
  }
  yield* Console.log(`  Total: ${totalHours}h`);

  yield* Console.log("\n--- Comments with replies ---");
  const comments = yield* db.comment.findMany({
    where: { parentId: null },
    include: {
      author: true,
      replies: { include: { author: true } },
    },
    take: 3,
  });

  for (const comment of comments) {
    yield* Console.log(`  ${comment.author.name}: "${comment.content}"`);
    for (const reply of comment.replies) {
      yield* Console.log(`    ↳ ${reply.author.name}: "${reply.content}"`);
    }
  }

  yield* Console.log("\n=== Done! ===");

  return { orgCount, userCount, projectCount, taskCount };
});

const client = new PrismaClient();
const PrismaLayer = PrismaLive(client);
const AppLayer = Layer.provideMerge(DB.Default, PrismaLayer);

Effect.runPromise(
  Effect.provide(program, AppLayer).pipe(
    Effect.ensuring(Effect.sync(() => client.$disconnect()))
  )
)
  .then((stats) => {
    console.log("\nStats:", stats);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
