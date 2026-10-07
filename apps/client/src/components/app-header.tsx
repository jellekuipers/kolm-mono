import { Avatar, Box, Button, Container, HStack, IconButton, Link, Text } from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink, useRouter } from "@tanstack/react-router";
import { SignIn as SignInIcon, SignOut as SignOutIcon } from "@phosphor-icons/react";
import { getAuthClient } from "#/lib/auth-client";
import { meQueryOptions } from "#/lib/queries";

/** The top bar: app name, navigation, and the signed-in user or a sign-in button. */
export function AppHeader() {
  // Not suspending: the header must render even when the API is down.
  const { data: me } = useQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const router = useRouter();

  const signOut = async () => {
    const { error } = await getAuthClient().signOut();
    if (error) return;
    queryClient.setQueryData(meQueryOptions.queryKey, null);
    await router.navigate({ to: "/" });
    await router.invalidate();
  };

  return (
    <Box as="header" borderBottomWidth="1px">
      <Container>
        <HStack justify="space-between" paddingY="3">
          <HStack gap="6">
            <Link asChild fontFamily="heading" fontWeight="semibold">
              <RouterLink to="/">kolm-mono</RouterLink>
            </Link>
            <Link asChild color="fg.muted">
              <RouterLink to="/notes">Notes</RouterLink>
            </Link>
            <Link asChild color="fg.muted">
              <RouterLink to="/profile">Profile</RouterLink>
            </Link>
          </HStack>
          {me ? (
            <HStack gap="3">
              <Avatar.Root size="xs">
                <Avatar.Image src={me.image ?? undefined} />
                <Avatar.Fallback name={me.name} />
              </Avatar.Root>
              <Text textStyle="sm">{me.name}</Text>
              <IconButton aria-label="Sign out" variant="ghost" size="sm" onClick={signOut}>
                <SignOutIcon />
              </IconButton>
            </HStack>
          ) : (
            <Button asChild size="sm" variant="outline">
              <RouterLink to="/sign-in">
                <SignInIcon /> Sign in
              </RouterLink>
            </Button>
          )}
        </HStack>
      </Container>
    </Box>
  );
}
