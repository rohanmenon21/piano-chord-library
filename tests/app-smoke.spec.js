import { expect, test } from "@playwright/test";

test("loads the mock app and opens song preview by default", async ({ page }) => {
  await page.goto("/?mock=1");

  await expect(page.getByRole("tab", { name: "Songs" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#preview-title")).toHaveText("Demo Song");
  await expect(page.locator("#song-list .song-list-item")).toHaveCount(2);
});

test("switching to setlists selects the first setlist and enables navigation", async ({ page }) => {
  await page.goto("/?mock=1");
  await page.getByRole("tab", { name: "Setlists" }).click();

  await expect(page.locator("#setlist-edit-tab")).toHaveAttribute("aria-selected", "false");
  await expect(page.locator("#setlist-preview-tab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#setlist-preview-title")).toHaveText("Demo Song");
  await expect(page.locator("#setlist-preview-next")).toBeEnabled();
  await expect(page.locator("#setlist-preview-prev")).toBeDisabled();

  await page.locator("#setlist-preview-next").click();
  await expect(page.locator("#setlist-preview-title")).toHaveText("Second Song");
  await expect(page.locator("#setlist-preview-prev")).toBeEnabled();

  await page.locator("#setlist-preview-prev").click();
  await expect(page.locator("#setlist-preview-title")).toHaveText("Demo Song");
});

test("songs workspace clears setlist context before performance mode", async ({ page }) => {
  await page.goto("/?mock=1");

  await page.getByRole("tab", { name: "Setlists" }).click();
  await page.locator("#setlist-performance-mode-button").click();
  await expect(page.locator("#performance-context")).toHaveText(/Setlist:/);
  await page.locator("#performance-close").click();

  await page.getByRole("tab", { name: "Songs" }).click();
  await page.locator('#song-list [data-song-id="mock-song-2"]').click();
  await page.locator("#performance-mode-button").click();
  await expect(page.locator("#performance-context")).toHaveText("Performance Mode");
});

test("setlist sidebar search, sort, and expand collapse stay in sync", async ({ page }) => {
  await page.goto("/?mock=1");
  await page.getByRole("tab", { name: "Setlists" }).click();

  const sundaySet = page.getByRole("button", { name: /Sunday Set/ });
  await expect(sundaySet).toHaveAttribute("aria-expanded", "true");
  await sundaySet.click();
  await expect(sundaySet).toHaveAttribute("aria-expanded", "false");
  await sundaySet.click();
  await expect(sundaySet).toHaveAttribute("aria-expanded", "true");

  await page.locator("#setlist-search").fill("rehearsal");
  await expect(page.locator("#setlist-list .setlist-tree")).toHaveCount(1);
  await expect(page.locator("#setlist-list")).toContainText("Rehearsal Set");

  await page.locator("#setlist-search").fill("");
  await page.locator("#setlist-sort").selectOption("name");
  await expect(page.locator("#setlist-list .setlist-tree").first()).toContainText("Rehearsal Set");
  await expect(page.locator("#setlist-list .setlist-tree").nth(1)).toContainText("Sunday Set");
});
