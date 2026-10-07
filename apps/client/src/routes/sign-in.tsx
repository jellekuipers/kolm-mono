import { Alert, Button, Card, Container, Heading, Text } from "@chakra-ui/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GithubLogo } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { getAuthClient } from "#/lib/auth-client";
import { healthQueryOptions, meQueryOptions } from "#/lib/queries";
import { safeRedirect } from "#/lib/redirect";

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context, search }) => {
    const me = await context.queryClient.query(meQueryOptions).catch(() => null);
    if (me) throw redirect({ href: safeRedirect(search.redirect) });
  },
  loader: ({ context }) => context.queryClient.query(healthQueryOptions),
  component: SignIn,
});

function SignIn() {
  const { redirect: target } = Route.useSearch();
  const { data: health } = useSuspenseQuery(healthQueryOptions);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const authDisabled = health.checks.auth === "disabled";

  // Redirects the browser to GitHub; better-auth brings the user back to `callbackURL`.
  const signIn = async () => {
    setPending(true);
    setError(undefined);
    const { error } = await getAuthClient().signIn.social({
      provider: "github",
      callbackURL: safeRedirect(target),
    });
    if (error) {
      setError(error.message ?? "Sign-in failed");
      setPending(false);
    }
  };

  return (
    <Container maxWidth="md" paddingY="16">
      <Card.Root>
        <Card.Header>
          <Heading size="xl">Sign in</Heading>
          <Text color="fg.muted">Use your GitHub account to continue.</Text>
        </Card.Header>
        <Card.Body gap="4">
          {authDisabled && (
            <Alert.Root status="info">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Sign-in isn't configured</Alert.Title>
                <Alert.Description>
                  Set DATABASE_URL, BETTER_AUTH_SECRET, GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
                  (see .env.schema).
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
          <Button onClick={signIn} loading={pending} disabled={authDisabled}>
            <GithubLogo /> Sign in with GitHub
          </Button>
        </Card.Body>
      </Card.Root>
    </Container>
  );
}
