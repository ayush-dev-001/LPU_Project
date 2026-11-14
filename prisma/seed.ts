/**
 * Demo data. Run with `npm run db:seed` (or `npm run db:reset` to wipe and reseed).
 * Every account's password is: Password@123
 * Dates are relative to today, so the demo always shows a mix of on-track, at-risk and late work.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { TaskPriority, TaskStatus } from "../src/generated/prisma/enums";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const day = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * day);
const daysAhead = (n: number) => new Date(Date.now() + n * day);

async function main() {
  // Wipe in dependency order.
  await db.activityLog.deleteMany();
  await db.notification.deleteMany();
  await db.document.deleteMany();
  await db.expense.deleteMany();
  await db.progressUpdate.deleteMany();
  await db.task.deleteMany();
  await db.milestone.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password@123", 10);
  const mk = (name: string, email: string, role: "ADMIN" | "MANAGER" | "MEMBER") =>
    db.user.create({ data: { name, email, role, passwordHash } });

  const admin = await mk("Admin User", "admin@projectpulse.dev", "ADMIN");
  const priya = await mk("Priya Sharma", "priya@projectpulse.dev", "MANAGER");
  const rahul = await mk("Rahul Verma", "rahul@projectpulse.dev", "MANAGER");
  const aman = await mk("Aman Gupta", "aman@projectpulse.dev", "MEMBER");
  const sneha = await mk("Sneha Iyer", "sneha@projectpulse.dev", "MEMBER");
  const karan = await mk("Karan Singh", "karan@projectpulse.dev", "MEMBER");
  const neha = await mk("Neha Patel", "neha@projectpulse.dev", "MEMBER");

  type TaskSeed = [title: string, status: TaskStatus, priority: TaskPriority, assigneeId: string, due: Date];

  async function project(input: {
    code: string;
    name: string;
    description: string;
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
    start: Date;
    end: Date;
    budget: number;
    managerId: string;
    memberIds: string[];
    milestones: [title: string, due: Date, done: boolean][];
    tasks: TaskSeed[];
    expenses: [title: string, amount: number, category: "LABOUR" | "MATERIAL" | "EQUIPMENT" | "SOFTWARE" | "TRAVEL" | "OTHER", spentOn: Date][];
    updates: [authorId: string, summary: string, blockers: string | null, pct: number, at: Date][];
  }) {
    const p = await db.project.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        status: input.status,
        startDate: input.start,
        endDate: input.end,
        budget: input.budget,
        managerId: input.managerId,
        members: { create: input.memberIds.map((userId) => ({ userId })) },
      },
    });

    const milestones = [];
    for (const [title, dueDate, done] of input.milestones) {
      milestones.push(
        await db.milestone.create({
          data: {
            projectId: p.id,
            title,
            dueDate,
            status: done ? "COMPLETED" : "PENDING",
            completedAt: done ? dueDate : null,
          },
        }),
      );
    }

    let position = 0;
    for (const [i, [title, status, priority, assigneeId, dueDate]] of input.tasks.entries()) {
      await db.task.create({
        data: {
          projectId: p.id,
          milestoneId: milestones[Math.min(Math.floor(i / 3), milestones.length - 1)]?.id,
          title,
          status,
          priority,
          assigneeId,
          createdById: input.managerId,
          startDate: input.start,
          dueDate,
          completedAt: status === "DONE" ? dueDate : null,
          position: position++,
        },
      });
    }

    await db.expense.createMany({
      data: input.expenses.map(([title, amount, category, spentOn]) => ({
        projectId: p.id,
        title,
        amount,
        category,
        spentOn,
        recordedById: input.managerId,
      })),
    });

    await db.progressUpdate.createMany({
      data: input.updates.map(([authorId, summary, blockers, percentComplete, createdAt]) => ({
        projectId: p.id,
        authorId,
        summary,
        blockers,
        percentComplete,
        createdAt,
      })),
    });

    await db.activityLog.create({
      data: { projectId: p.id, actorId: input.managerId, action: "project.created", entityType: "Project", entityId: p.id },
    });
    return p;
  }

  // 1 — healthy, on track
  await project({
    code: "PRJ-001",
    name: "Campus Smart Attendance System",
    description: "RFID + face-recognition attendance for all lecture halls, with a web portal for faculty.",
    status: "ACTIVE",
    start: daysAgo(45),
    end: daysAhead(40),
    budget: 450000,
    managerId: priya.id,
    memberIds: [aman.id, sneha.id],
    milestones: [
      ["Requirements signed off", daysAgo(30), true],
      ["Hardware pilot in Block 34", daysAhead(5), false],
      ["Campus-wide rollout", daysAhead(38), false],
    ],
    tasks: [
      ["Collect requirements from departments", "DONE", "HIGH", aman.id, daysAgo(35)],
      ["Finalise RFID reader vendor", "DONE", "HIGH", priya.id, daysAgo(28)],
      ["Design database for attendance logs", "DONE", "MEDIUM", sneha.id, daysAgo(25)],
      ["Install readers in pilot block", "IN_PROGRESS", "HIGH", aman.id, daysAhead(3)],
      ["Faculty dashboard UI", "IN_PROGRESS", "MEDIUM", sneha.id, daysAhead(10)],
      ["Face-recognition accuracy testing", "TODO", "MEDIUM", sneha.id, daysAhead(18)],
      ["Train faculty on the portal", "TODO", "LOW", aman.id, daysAhead(32)],
    ],
    expenses: [
      ["RFID readers (pilot batch)", 120000, "EQUIPMENT", daysAgo(26)],
      ["Cloud hosting – 3 months", 18000, "SOFTWARE", daysAgo(20)],
      ["Installation labour", 25000, "LABOUR", daysAgo(5)],
    ],
    updates: [
      [aman.id, "Readers mounted in 6 of 10 pilot rooms.", null, 55, daysAgo(2)],
      [sneha.id, "Dashboard shows live attendance; export pending.", null, 50, daysAgo(1)],
    ],
  });

  // 2 — behind schedule and over budget (at risk)
  await project({
    code: "PRJ-002",
    name: "Hostel Block C Renovation",
    description: "Electrical rewiring, plumbing and room refurbishment for 120 rooms.",
    status: "ACTIVE",
    start: daysAgo(80),
    end: daysAhead(10),
    budget: 1200000,
    managerId: rahul.id,
    memberIds: [karan.id, neha.id],
    milestones: [
      ["Electrical rewiring complete", daysAgo(20), true],
      ["Plumbing complete", daysAgo(5), false],
      ["Handover to hostel office", daysAhead(10), false],
    ],
    tasks: [
      ["Electrical audit", "DONE", "HIGH", karan.id, daysAgo(70)],
      ["Rewire floors 1–3", "DONE", "URGENT", karan.id, daysAgo(22)],
      ["Replace water lines", "IN_PROGRESS", "URGENT", neha.id, daysAgo(6)],
      ["Bathroom fittings", "TODO", "HIGH", neha.id, daysAgo(2)],
      ["Repaint rooms", "TODO", "MEDIUM", karan.id, daysAhead(6)],
      ["Furniture installation", "TODO", "MEDIUM", neha.id, daysAhead(8)],
      ["Final safety inspection", "TODO", "HIGH", rahul.id, daysAhead(9)],
    ],
    expenses: [
      ["Copper wiring & panels", 420000, "MATERIAL", daysAgo(60)],
      ["Electricians (contract)", 310000, "LABOUR", daysAgo(25)],
      ["Plumbing materials", 280000, "MATERIAL", daysAgo(15)],
      ["Plumbers (contract)", 160000, "LABOUR", daysAgo(3)],
    ],
    updates: [
      [neha.id, "Water line replacement slowed by pipe shortage.", "Supplier delayed PVC pipes by a week.", 40, daysAgo(3)],
      [rahul.id, "Requested extra budget approval for plumbing.", "Budget nearly exhausted.", 45, daysAgo(1)],
    ],
  });

  // 3 — planning stage
  await project({
    code: "PRJ-003",
    name: "Library Digital Catalogue",
    description: "Move 40,000 book records to a searchable online catalogue with barcode issue/return.",
    status: "PLANNING",
    start: daysAhead(7),
    end: daysAhead(120),
    budget: 300000,
    managerId: priya.id,
    memberIds: [neha.id],
    milestones: [
      ["Vendor selection", daysAhead(20), false],
      ["Data migration", daysAhead(75), false],
    ],
    tasks: [
      ["Compare catalogue software", "TODO", "MEDIUM", neha.id, daysAhead(15)],
      ["Estimate barcode label cost", "TODO", "LOW", neha.id, daysAhead(18)],
    ],
    expenses: [],
    updates: [],
  });

  // 4 — completed
  await project({
    code: "PRJ-004",
    name: "Annual Tech Fest Website",
    description: "Event registration, schedule and payment site for the annual tech fest.",
    status: "COMPLETED",
    start: daysAgo(150),
    end: daysAgo(60),
    budget: 80000,
    managerId: rahul.id,
    memberIds: [aman.id, sneha.id],
    milestones: [
      ["Registration live", daysAgo(110), true],
      ["Event week", daysAgo(62), true],
    ],
    tasks: [
      ["Design landing page", "DONE", "MEDIUM", sneha.id, daysAgo(130)],
      ["Payment gateway integration", "DONE", "HIGH", aman.id, daysAgo(115)],
      ["Event schedule page", "DONE", "MEDIUM", sneha.id, daysAgo(100)],
    ],
    expenses: [
      ["Domain and hosting", 6000, "SOFTWARE", daysAgo(140)],
      ["Promotion", 22000, "OTHER", daysAgo(90)],
    ],
    updates: [[rahul.id, "Fest concluded: 3,200 registrations.", null, 100, daysAgo(60)]],
  });

  await db.notification.createMany({
    data: [
      { userId: neha.id, type: "TASK_OVERDUE", title: "Task overdue", message: "“Replace water lines” was due 6 days ago.", link: "/tasks" },
      { userId: rahul.id, type: "BUDGET_ALERT", title: "Budget alert", message: "Hostel Block C Renovation has used 98% of its budget.", link: "/projects" },
      { userId: aman.id, type: "TASK_DUE_SOON", title: "Due soon", message: "“Install readers in pilot block” is due in 3 days.", link: "/tasks" },
    ],
  });

  console.log(`Seeded. Log in as ${admin.email} (or any @projectpulse.dev user) with password Password@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
