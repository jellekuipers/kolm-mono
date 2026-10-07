import {
  Avatar,
  Button,
  Card,
  Container,
  Field,
  HStack,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { getAuthClient } from "#/lib/auth-client";
import { meQueryOptions } from "#/lib/queries";

export const Route = createFileRoute("/_authed/profile")({
  component: Profile,
});

const ProfileForm = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100, "Use at most 100 characters"),
});

function Profile() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<{ ok: boolean; message: string }>();

  // TanStack Form validates with the Zod schema on every change, and only submits valid values.
  const form = useForm({
    defaultValues: { name: me?.name ?? "" },
    validators: { onChange: ProfileForm },
    onSubmit: async ({ value, formApi }) => {
      const name = value.name.trim();
      const { error } = await getAuthClient().updateUser({ name });
      if (error) {
        setStatus({ ok: false, message: error.message ?? "Couldn't save" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
      // The saved value is the new baseline, so Save is disabled until the next edit.
      formApi.reset({ name });
      setStatus({ ok: true, message: "Saved" });
    },
  });

  if (!me) return null;

  return (
    <Container maxWidth="md" paddingY="16">
      <Card.Root>
        <Card.Header>
          <HStack gap="4">
            <Avatar.Root size="lg">
              <Avatar.Image src={me.image ?? undefined} />
              <Avatar.Fallback name={me.name} />
            </Avatar.Root>
            <Stack gap="0">
              <Heading size="xl">{me.name}</Heading>
              <Text color="fg.muted">{me.email}</Text>
            </Stack>
          </HStack>
        </Card.Header>
        <Card.Body>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <Stack gap="4">
              <form.Field name="name">
                {(field) => (
                  <Field.Root invalid={field.state.meta.errors.length > 0}>
                    <Field.Label>Display name</Field.Label>
                    <Input
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        setStatus(undefined);
                        field.handleChange(event.target.value);
                      }}
                    />
                    <Field.ErrorText>
                      {field.state.meta.errors.map((issue) => issue?.message).join(", ")}
                    </Field.ErrorText>
                  </Field.Root>
                )}
              </form.Field>
              <HStack>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
                >
                  {([canSubmit, isSubmitting, isDirty]) => (
                    <Button type="submit" disabled={!canSubmit || !isDirty} loading={isSubmitting}>
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
    </Container>
  );
}
