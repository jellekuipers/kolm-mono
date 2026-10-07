import { expect, test, vi } from "vite-plus/test";
import { CreateNoteInput, ListNotesInput, Note, listNotes } from "../src/notes.ts";

const note: Note = {
  id: "n1",
  title: "Hello",
  body: "First note",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const fakeDeps = () => ({
  findNotes: vi.fn(() => Promise.resolve([note])),
  insertNote: vi.fn((input: CreateNoteInput) => Promise.resolve({ ...note, ...input })),
});

test("listNotes returns what the data access finds", async () => {
  const deps = fakeDeps();
  const result = await listNotes(deps, { query: "hello", limit: 5 });
  expect(result).toEqual({ notes: [note] });
  expect(deps.findNotes).toHaveBeenCalledWith({ query: "hello", limit: 5 });
});

test("listNotes treats an empty query as no query", async () => {
  const deps = fakeDeps();
  await listNotes(deps, { query: "", limit: 20 });
  expect(deps.findNotes).toHaveBeenCalledWith({ query: undefined, limit: 20 });
});

test("CreateNoteInput trims and rejects empty or oversized text", () => {
  expect(CreateNoteInput.parse({ title: "  Hi ", body: " there " })).toEqual({
    title: "Hi",
    body: "there",
  });
  expect(CreateNoteInput.safeParse({ title: "   ", body: "x" }).success).toBe(false);
  expect(CreateNoteInput.safeParse({ title: "x", body: "y".repeat(2_001) }).success).toBe(false);
});

test("ListNotesInput defaults the limit, coerces text and caps it", () => {
  expect(ListNotesInput.parse({})).toEqual({ limit: 20 });
  expect(ListNotesInput.parse({ limit: "5" })).toEqual({ limit: 5 });
  expect(ListNotesInput.safeParse({ limit: 51 }).success).toBe(false);
});
