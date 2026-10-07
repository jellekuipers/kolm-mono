import { Alert } from "@chakra-ui/react/alert";
import { Badge } from "@chakra-ui/react/badge";
import { Container } from "@chakra-ui/react/container";
import { DataList } from "@chakra-ui/react/data-list";
import { Heading } from "@chakra-ui/react/heading";
import { Link } from "@chakra-ui/react/link";
import { Stack } from "@chakra-ui/react/stack";
import { Text } from "@chakra-ui/react/text";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatDuration } from "#/lib/format";
import { healthQueryOptions, meQueryOptions } from "#/lib/queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(healthQueryOptions),
      context.queryClient.query(meQueryOptions),
    ]),
  component: RouteComponent,
  errorComponent: ({ error }) => (
    <Container paddingY="16">
      <Stack gap="6">
        <Heading size="3xl">kolm-mono</Heading>
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error instanceof Error ? error.message : String(error)}</Alert.Title>
        </Alert.Root>
      </Stack>
    </Container>
  ),
});

const palette = { ok: "green", degraded: "orange", error: "red", disabled: "gray" } as const;

function RouteComponent() {
  const { data: health } = useSuspenseQuery(healthQueryOptions);
  const { data: me } = useSuspenseQuery(meQueryOptions);

  return (
    <Container paddingY="16">
      <Stack gap="8">
        <Stack gap="2">
          <Heading size="3xl">kolm-mono</Heading>
          <Text color="fg.muted">
            Starter: TanStack Start client, Hono API, MCP server. See the{" "}
            <Link href="/api/docs" colorPalette="teal" variant="underline">
              API docs
            </Link>
            .
          </Text>
        </Stack>
        <DataList.Root orientation="horizontal">
          <DataList.Item>
            <DataList.ItemLabel>API</DataList.ItemLabel>
            <DataList.ItemValue>
              <Badge colorPalette={palette[health.status]}>{health.status}</Badge>
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Database</DataList.ItemLabel>
            <DataList.ItemValue>
              <Badge colorPalette={palette[health.checks.database]}>{health.checks.database}</Badge>
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Auth</DataList.ItemLabel>
            <DataList.ItemValue>
              <Badge colorPalette={palette[health.checks.auth]}>{health.checks.auth}</Badge>
            </DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>User</DataList.ItemLabel>
            <DataList.ItemValue>{me ? me.email : "Not signed in"}</DataList.ItemValue>
          </DataList.Item>
          <DataList.Item>
            <DataList.ItemLabel>Uptime</DataList.ItemLabel>
            <DataList.ItemValue>{formatDuration(health.uptime)}</DataList.ItemValue>
          </DataList.Item>
        </DataList.Root>
      </Stack>
    </Container>
  );
}
