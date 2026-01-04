import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.comment.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Johnson",
      timezone: "America/New_York",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Smith",
      timezone: "America/Los_Angeles",
      managerId: alice.id,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@example.com",
      name: "Charlie Brown",
      timezone: "Europe/London",
      managerId: alice.id,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      slug: "acme",
      description: "Building the future",
      metadata: { industry: "technology", size: "startup" },
      members: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "ADMIN" },
          { userId: charlie.id, role: "MEMBER" },
        ],
      },
    },
  });

  const engineering = await prisma.team.create({
    data: {
      name: "Engineering",
      description: "Product development team",
      color: "#3b82f6",
      organizationId: org.id,
      members: {
        create: [
          { userId: alice.id, role: "ADMIN" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  await prisma.team.create({
    data: {
      name: "Design",
      description: "UX and visual design",
      color: "#8b5cf6",
      organizationId: org.id,
      members: {
        create: [{ userId: charlie.id, role: "ADMIN" }],
      },
    },
  });

  const bugTag = await prisma.tag.create({
    data: { name: "bug", color: "#ef4444" },
  });
  const featureTag = await prisma.tag.create({
    data: { name: "feature", color: "#22c55e" },
  });
  const urgentTag = await prisma.tag.create({
    data: { name: "urgent", color: "#f59e0b" },
  });

  const project = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Complete overhaul of the company website",
      status: "ACTIVE",
      budget: 50000,
      startDate: new Date("2024-01-01"),
      dueDate: new Date("2024-06-30"),
      settings: { sprintLength: 2, estimationMethod: "fibonacci" },
      teamId: engineering.id,
      ownerId: alice.id,
      tags: { connect: [{ id: featureTag.id }] },
    },
  });

  const task1 = await prisma.task.create({
    data: {
      title: "Design new homepage",
      description: "Create wireframes and mockups for the new homepage",
      status: "IN_PROGRESS",
      priority: "HIGH",
      estimateHours: 16,
      dueDate: new Date("2024-02-15"),
      position: 1,
      projectId: project.id,
      creatorId: alice.id,
      assigneeId: charlie.id,
      tags: { connect: [{ id: featureTag.id }] },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Implement responsive navigation",
      description: "Build mobile-friendly navigation component",
      status: "TODO",
      priority: "MEDIUM",
      estimateHours: 8,
      position: 2,
      projectId: project.id,
      creatorId: alice.id,
      assigneeId: bob.id,
      parentId: task1.id,
      tags: { connect: [{ id: featureTag.id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Fix header layout on Safari",
      description: "Header breaks on Safari 15.x",
      status: "BACKLOG",
      priority: "CRITICAL",
      estimateHours: 2,
      position: 3,
      projectId: project.id,
      creatorId: bob.id,
      tags: { connect: [{ id: bugTag.id }, { id: urgentTag.id }] },
    },
  });

  await prisma.comment.create({
    data: {
      content: "I've started working on the wireframes. Will share by EOD.",
      taskId: task1.id,
      authorId: charlie.id,
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      content: "Looking good! Can we add a dark mode toggle?",
      taskId: task1.id,
      authorId: alice.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "Yes, I'll add that to the design!",
      taskId: task1.id,
      authorId: charlie.id,
      parentId: comment2.id,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: "Initial wireframe sketches",
      hours: 3.5,
      date: new Date("2024-01-15"),
      billable: true,
      taskId: task1.id,
      userId: charlie.id,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: "Reviewed navigation requirements",
      hours: 1,
      date: new Date("2024-01-16"),
      billable: true,
      taskId: task2.id,
      userId: bob.id,
    },
  });

  console.log("Database seeded successfully!");
  console.log({
    users: 3,
    organizations: 1,
    teams: 2,
    projects: 1,
    tasks: 3,
    comments: 3,
    timeEntries: 2,
    tags: 3,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
