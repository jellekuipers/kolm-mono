import {
  Alert,
  Button,
  Card,
  Container,
  Field,
  HStack,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link as RouterLink, createFileRoute } from "@tanstack/react-router";
// `core/notes` is plain Zod, so the client can share the API's schema without pulling in
// `core`'s Node-only code.
import { CreateNoteInput } from "core/notes";
import { useState } from "react";
import { getApi } from "#/lib/api";
import { toApiError } from "#/lib/api-error";
import { meQueryOptions, notesQueryOptions } from "#/lib/queries";

// The worked example page: see "Worked example: notes" in AGENTS.md. Anyone can read
// notes; the form is only shown to signed-in users.
export const Route = createFileRoute("/notes")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(notesQueryOptions),
      context.queryClient.query(meQueryOptions),
    ]),
  component: Notes,
  // Without a database the API answers 503 with a message that says what to configure.
  errorComponent: ({ error }) => (
    <Container maxWidth="md" paddingY="16">
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Title>{error instanceof Error ? error.message : String(error)}</Alert.Title>
      </Alert.Root>
    </Container>
  ),
});

function Notes() {
  const { data } = useSuspenseQuery(notesQueryOptions);
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<{ ok: boolean; message: string }>();

  // TanStack Form validates with the Zod schema on every change, and only submits valid values.
  const form = useForm({
    defaultValues: { title: "", body: "" },
    validators: { onChange: CreateNoteInput },
    onSubmit: async ({ value, formApi }) => {
      const res = await getApi().api.notes.$post({ json: value });
      if (!res.ok) {
        const error = await toApiError(res);
        setStatus({ ok: false, message: error.message });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: notesQueryOptions.queryKey });
      formApi.reset();
      setStatus({ ok: true, message: "Saved" });
    },
  });

  return (
    <Container maxWidth="md" paddingY="16">
      <Stack gap="8">
        <Stack gap="2">
          <Heading size="3xl">Notes</Heading>
          <Text color="fg.muted">
            Demo data: anyone can read notes, and signed-in users can add them. The MCP tool{" "}
            <code>list_notes</code> reads the same list.
          </Text>
        </Stack>
        {!me && (
          <Text color="fg.muted">
            <RouterLink to="/sign-in" search={{ redirect: "/notes" }}>
              Sign in
            </RouterLink>{" "}
            to add a note.
          </Text>
        )}
        {me && (
          <Card.Root>
            <Card.Body>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void form.handleSubmit();
                }}
              >
                <Stack gap="4">
                  {(
                    [
                      ["title", "Title"],
                      ["body", "Text"],
                    ] as const
                  ).map(([name, label]) => (
                    <form.Field key={name} name={name}>
                      {(field) => {
                        const control = {
                          name: field.name,
                          value: field.state.value,
                          onBlur: field.handleBlur,
                          onChange: (
                            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          ) => {
                            setStatus(undefined);
                            field.handleChange(event.target.value);
                          },
                        };
                        return (
                          <Field.Root invalid={field.state.meta.errors.length > 0}>
                            <Field.Label>{label}</Field.Label>
                            {name === "body" ? <Textarea {...control} /> : <Input {...control} />}
                            <Field.ErrorText>
                              {field.state.meta.errors.map((issue) => issue?.message).join(", ")}
                            </Field.ErrorText>
                          </Field.Root>
                        );
                      }}
                    </form.Field>
                  ))}
                  <HStack>
                    <form.Subscribe
                      selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
                    >
                      {([canSubmit, isSubmitting, isDirty]) => (
                        <Button
                          type="submit"
                          disabled={!canSubmit || !isDirty}
                          loading={isSubmitting}
                        >
                          Save
                        </Button>
                      )}
                    </form.Subscribe>
                    {status && (
                      <Text color={status.ok ? "fg.success" : "fg.error"} textStyle="sm">
                        {status.message}
                      </Text>
                    )}
                  </HStack>
                </Stack>
              </form>
            </Card.Body>
          </Card.Root>
        )}
        <Stack gap="4">
          {data.notes.length === 0 && <Text color="fg.muted">No notes yet.</Text>}
          {data.notes.map((note) => (
            <Card.Root key={note.id}>
              <Card.Body gap="1">
                <Card.Title>{note.title}</Card.Title>
                <Text whiteSpace="pre-wrap">{note.body}</Text>
                <Text color="fg.muted" textStyle="xs">
                  {/* The server renders its own time zone; the browser corrects it to the user's. */}
                  <time dateTime={note.createdAt} suppressHydrationWarning>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </time>
                </Text>
              </Card.Body>
            </Card.Root>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
