import { expect, test } from "@playwright/test";

test.describe("public production smoke", () => {
  test("root redirects into Arabic locale", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok() || response?.status() === 308 || response?.status() === 307).toBeTruthy();
    await expect(page).toHaveURL(/\/ar\/?$/);
  });

  test("Arabic marketing page loads without 0 IQD and without LIVE_TRADING jargon", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("h1").first()).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/\b0\s*IQD\b/i);
    expect(body).not.toContain("LIVE_TRADING=false");
    expect(body).not.toContain("APPEND ONLY");
    expect(body).not.toContain("AAL2");
  });

  test("English marketing and security page are reachable", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/en/security-compliance");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("dashboard and admin are protected", async ({ page }) => {
    await page.goto("/ar/dashboard");
    await expect(page).toHaveURL(/\/ar\/login/);
    await page.goto("/ar/admin");
    await expect(page).toHaveURL(/\/ar\/login|\/ar\/dashboard/);
  });

  test("robots and sitemap reference production host", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain("gulf-gate-platform.vercel.app");
    expect(robotsText).not.toContain("localhost");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("gulf-gate-platform.vercel.app");
    expect(sitemapText).toContain("/security-compliance");
  });

  test("health endpoint reports live trading locked", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.liveTradingLocked).toBe(true);
    expect(body.service).toBe("gulf-gate-platform");
  });

  test("market prices never return zero IQD", async ({ request }) => {
    const response = await request.get("/api/market/prices");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const usdt = (body.assets || []).find((asset: { symbol: string }) => asset.symbol === "USDT");
    expect(usdt).toBeTruthy();
    expect(Number(usdt.iqd)).toBeGreaterThan(0);
    expect(Number(usdt.usd)).toBeGreaterThan(0);
  });
});
