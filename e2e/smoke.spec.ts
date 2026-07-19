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
    expect(body).not.toContain("EMAIL VERIFIED");
  });

  test("English marketing and expanded legal pages are reachable", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/en/security-compliance");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/en/legal/cookies");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/en/legal/data-deletion");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("login is email-only and verify redirects", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/الهاتف|\+964|Email or phone/i);
    await page.goto("/ar/verify");
    await expect(page).toHaveURL(/\/ar\/login/);
  });

  test("dashboard and country payment admin routes are protected", async ({ page }) => {
    for (const path of ["/ar/dashboard", "/ar/admin", "/ar/admin/payments/iraq", "/ar/admin/payments/uae"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/ar\/login|\/ar\/dashboard/);
    }
  });

  test("robots and sitemap reference production host and legal docs", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain("gulf-gate-platform.vercel.app");
    expect(robotsText).not.toContain("localhost");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("gulf-gate-platform.vercel.app");
    expect(sitemapText).toContain("/legal/cookies");
    expect(sitemapText).toContain("/legal/data-deletion");
  });

  test("public health endpoint is minimal and locked", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());
    expect(response.status()).not.toBe(404);
    const body = await response.json();
    expect(body.service).toBe("gulf-gate-platform");
    expect(body.liveTradingLocked).toBe(true);
    expect(body).not.toHaveProperty("version");
    expect(body).not.toHaveProperty("fxFallback");
    expect(body).not.toHaveProperty("checks");
  });

  test("market prices never return zero IQD for available USDT", async ({ request }) => {
    const response = await request.get("/api/market/prices");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const usdt = (body.assets || []).find((asset: { symbol: string }) => asset.symbol === "USDT");
    expect(usdt).toBeTruthy();
    if (usdt.available !== false) {
      expect(Number(usdt.iqd)).toBeGreaterThan(0);
      expect(Number(usdt.usd)).toBeGreaterThan(0);
    }
    expect(body).not.toHaveProperty("providerError");
  });

  test("internal health requires auth", async ({ request }) => {
    const response = await request.get("/api/internal/health");
    expect(response.status()).toBe(401);
  });
});
