# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> public production smoke >> health endpoint reports live trading locked
- Location: e2e/smoke.spec.ts:48:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 404
Received array: [200, 503]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.describe("public production smoke", () => {
  4  |   test("root redirects into Arabic locale", async ({ page }) => {
  5  |     const response = await page.goto("/");
  6  |     expect(response?.ok() || response?.status() === 308 || response?.status() === 307).toBeTruthy();
  7  |     await expect(page).toHaveURL(/\/ar\/?$/);
  8  |   });
  9  | 
  10 |   test("Arabic marketing page loads without 0 IQD and without LIVE_TRADING jargon", async ({ page }) => {
  11 |     await page.goto("/ar");
  12 |     await expect(page.locator("h1").first()).toBeVisible();
  13 |     const body = await page.locator("body").innerText();
  14 |     expect(body).not.toMatch(/\b0\s*IQD\b/i);
  15 |     expect(body).not.toContain("LIVE_TRADING=false");
  16 |     expect(body).not.toContain("APPEND ONLY");
  17 |     expect(body).not.toContain("AAL2");
  18 |   });
  19 | 
  20 |   test("English marketing and security page are reachable", async ({ page }) => {
  21 |     await page.goto("/en");
  22 |     await expect(page.locator("h1").first()).toBeVisible();
  23 |     await page.goto("/en/security-compliance");
  24 |     await expect(page.locator("h1").first()).toBeVisible();
  25 |   });
  26 | 
  27 |   test("dashboard and admin are protected", async ({ page }) => {
  28 |     await page.goto("/ar/dashboard");
  29 |     await expect(page).toHaveURL(/\/ar\/login/);
  30 |     await page.goto("/ar/admin");
  31 |     await expect(page).toHaveURL(/\/ar\/login|\/ar\/dashboard/);
  32 |   });
  33 | 
  34 |   test("robots and sitemap reference production host", async ({ request }) => {
  35 |     const robots = await request.get("/robots.txt");
  36 |     expect(robots.ok()).toBeTruthy();
  37 |     const robotsText = await robots.text();
  38 |     expect(robotsText).toContain("gulf-gate-platform.vercel.app");
  39 |     expect(robotsText).not.toContain("localhost");
  40 | 
  41 |     const sitemap = await request.get("/sitemap.xml");
  42 |     expect(sitemap.ok()).toBeTruthy();
  43 |     const sitemapText = await sitemap.text();
  44 |     expect(sitemapText).toContain("gulf-gate-platform.vercel.app");
  45 |     expect(sitemapText).toContain("/security-compliance");
  46 |   });
  47 | 
  48 |   test("health endpoint reports live trading locked", async ({ request }) => {
  49 |     const response = await request.get("/api/health");
> 50 |     expect([200, 503]).toContain(response.status());
     |                        ^ Error: expect(received).toContain(expected) // indexOf
  51 |     const body = await response.json();
  52 |     expect(body.liveTradingLocked).toBe(true);
  53 |     expect(body.service).toBe("gulf-gate-platform");
  54 |   });
  55 | 
  56 |   test("market prices never return zero IQD", async ({ request }) => {
  57 |     const response = await request.get("/api/market/prices");
  58 |     expect(response.ok()).toBeTruthy();
  59 |     const body = await response.json();
  60 |     const usdt = (body.assets || []).find((asset: { symbol: string }) => asset.symbol === "USDT");
  61 |     expect(usdt).toBeTruthy();
  62 |     expect(Number(usdt.iqd)).toBeGreaterThan(0);
  63 |     expect(Number(usdt.usd)).toBeGreaterThan(0);
  64 |   });
  65 | });
  66 | 
```