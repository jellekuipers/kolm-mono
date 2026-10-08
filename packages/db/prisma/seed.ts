// Seeds a development database with fixtures: `vp run db:seed` (also run by `db:migrate`
// after a reset). Keep it idempotent (upserts), so it can run any number of times.
// Add your POC's demo data here.
import { createDb } from "../src/index.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (run through `vp run db:seed`)");

const db = createDb(url);

// A demo user for data that needs an owner. Signing in still goes through GitHub.
const demo = await db.user.upsert({
  where: { email: "demo@example.com" },
  update: {},
  create: { id: "demo-user", name: "Demo User", email: "demo@example.com", emailVerified: true },
});

// Demo notes for the worked example (AGENTS.md, "Worked example: notes"). Fixed ids keep
// the upsert idempotent.
const notes = [
  {
    id: "demo-note-1",
    title: "Welcome",
    body: "A note from the seed. Create your own on the Notes page.",
  },
  {
    id: "demo-note-2",
    title: "Try the MCP tool",
    body: "The list_notes tool on /mcp reads these.",
  },
];
for (const note of notes) {
  await db.note.upsert({
    where: { id: note.id },
    update: { authorId: demo.id },
    create: { ...note, authorId: demo.id },
  });
}

await db.$disconnect();
console.info(`Seeded: user ${demo.email}, ${notes.length} notes`);
