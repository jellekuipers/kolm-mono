import { expect, test } from "@playwright/test";

test("the home page renders the API's health", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "kolm-mono" })).toBeVisible();
  await expect(page.getByText("API", { exact: true })).toBeVisible();
  await expect(page.locator(".chakra-badge").first()).toHaveText("ok");
});

test("protected pages send signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
});

test("the API docs load", async ({ page }) => {
  await page.goto("/api/docs");
  await expect(page.getByText("/health/ready")).toBeVisible();
});
