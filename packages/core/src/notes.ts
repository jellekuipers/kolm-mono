import { z } from "zod";

// The worked example resource: see "Worked example: notes" in AGENTS.md. Notes are
// public demo data, so nothing here is sensitive or tied to a user.

export const Note = z
  .object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Note" });
export type Note = z.infer<typeof Note>;

export const NoteList = z.object({ notes: z.array(Note) }).meta({ id: "NoteList" });
export type NoteList = z.infer<typeof NoteList>;

/** The body of `POST /api/notes`. Surrounding whitespace is trimmed before the length checks. */
export const CreateNoteInput = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(100, "Use at most 100 characters"),
    body: z.string().trim().min(1, "Enter some text").max(2_000, "Use at most 2000 characters"),
  })
  .meta({ id: "CreateNoteInput" });
export type CreateNoteInput = z.infer<typeof CreateNoteInput>;

/** The arguments of `listNotes`, shared by the HTTP query string and the MCP tool. */
export const ListNotesInput = z.object({
  /** Only notes whose title or body contains this text (case-insensitive). */
  query: z.string().trim().max(100).optional(),
  // `coerce`: query strings arrive as text.
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListNotesInput = z.infer<typeof ListNotesInput>;

/** The data access the notes functions need. `core` doesn't know how it's backed. */
export interface NotesDeps {
  /** At most `limit` notes, newest first, matching `query` when given. */
  findNotes: (args: { query?: string; limit: number }) => Promise<Note[]>;
  /** Stores a note and returns it. The input must already be validated with `CreateNoteInput`. */
  insertNote: (input: CreateNoteInput) => Promise<Note>;
}

/** Lists notes, newest first. */
export async function listNotes(
  { findNotes }: NotesDeps,
  { query, limit }: ListNotesInput,
): Promise<NoteList> {
  return { notes: await findNotes({ query: query || undefined, limit }) };
}
