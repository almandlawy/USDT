import { expect, test } from "@playwright/test";

const legalDocs = [
  "terms",
  "privacy",
  "risk",
  "cookies",
  "retention",
  "aup",
  "complaints",
  "data-deletion",
] as const;

const publicJargon = [/LIVE_TRADING\s*=\s*false/i, /\bAAL2\b/, /\bRLS\b/, /\bRPC\b/, /\bSupabase\b/, /\bUUID\b/, /Super Admin/i];

test.describe("production revision signature", () => {
  test("Arabic login is email-only with secure session copy", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/الهاتف|\+964|Email or phone|EMAIL VERIFIED|OTP VERIFIED/i);
    expect(body).toContain("جلسات دخول آمنة");
    expect(body).toContain("حماية متقدمة للحساب");
  });

  test("English login is email-only with secure session copy", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toHaveCount(0);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/phone|\+964|EMAIL VERIFIED/i);
    expect(body).toMatch(/Secure sessions/i);
    expect(body).toMatch(/Strong account protection/i);
  });

  test("register exposes required fields and password strength", async ({ page }) => {
    await page.goto("/ar/register");
    await expect(page.locator('input[name="displayName"], input[name="fullName"]').first()).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="passwordConfirm"], input[name="password_confirm"]').first()).toBeVisible();
    await expect(page.locator('select[name="accountType"], input[name="accountType"]').first()).toBeVisible();
    await expect(page.locator('input[name="termsAccepted"]')).toBeVisible();
    await expect(page.locator('input[name="privacyAccepted"]')).toBeVisible();
    await expect(page.locator('input[name="riskAccepted"]')).toBeVisible();
    await expect(page.locator(".passwordStrength, [data-password-strength]").first()).toBeVisible();
  });

  for (const locale of ["ar", "en"] as const) {
    test(`${locale} expanded legal pages load without technical jargon`, async ({ page }) => {
      for (const doc of legalDocs) {
        const response = await page.goto(`/${locale}/legal/${doc}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        const body = await page.locator("body").innerText();
        for (const pattern of publicJargon) {
          expect(body).not.toMatch(pattern);
        }
      }
    });
  }

  test("market API never exposes providerError and avoids fake zero IQD", async ({ request }) => {
    const response = await request.get("/api/market/prices");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).not.toHaveProperty("providerError");
    expect(["live", "live_with_derived_fx", "fallback"]).toContain(body.status);
    const usdt = (body.assets || []).find((asset: { symbol: string }) => asset.symbol === "USDT");
    expect(usdt).toBeTruthy();
    if (body.status === "fallback") {
      const btc = (body.assets || []).find((asset: { symbol: string }) => asset.symbol === "BTC");
      const eth = (body.assets || []).find((asset: { symbol: string }) => asset.symbol === "ETH");
      expect(btc?.available).toBe(false);
      expect(eth?.available).toBe(false);
      expect(btc?.usd).toBeNull();
      expect(eth?.usd).toBeNull();
    }
  });

  test("brand assets and icons are published", async ({ request, page }) => {
    for (const path of [
      "/favicon.ico",
      "/favicon.svg",
      "/icon-32.png",
      "/icon-192.png",
      "/icon-512.png",
      "/apple-touch-icon.png",
      "/maskable-icon-192.png",
      "/brand/gulf-gate-symbol.svg",
      "/brand/gulf-gate-logo-dark.svg",
      "/og/gulf-gate-cover.png",
      "/manifest.webmanifest",
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
    await page.goto("/ar");
    await expect(page.locator('.brand img, .brandMark, img[alt*="Gulf Gate"]').first()).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/إدارة طلبات USDT|Manage USDT requests/);
    expect(body).not.toMatch(/FEE_BPS|3,?500\s*IQD/);
  });
});
