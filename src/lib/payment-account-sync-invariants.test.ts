import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202607150016_payment_account_fail_closed_sync.sql"),
  "utf8",
);

const verification = readFileSync(resolve(process.cwd(), "supabase/verify-production.sql"), "utf8");

describe("migration 016 payment account fail-closed sync", () => {
  it("disables empty manual payment placeholders", () => {
    expect(migration).toContain("integration_mode = 'manual'");
    expect(migration).toContain("account_payload_encrypted");
    expect(migration).toContain("qr_storage_path");
    expect(migration).toContain("set enabled = false");
  });

  it("syncs configured country accounts into the public availability matrix", () => {
    expect(migration).toContain("sync_country_payment_account_availability");
    expect(migration).toContain("payment_method_availability");
    expect(migration).toContain("requires_proof");
    expect(migration).toContain("requires_redirect");
  });

  it("keeps live trading false and advances the migration marker", () => {
    expect(migration).toContain("202607150016");
    expect(migration).toContain("where key = 'live_trading'");
    expect(migration).not.toMatch(/live_trading[^\n]*true/i);
  });

  it("production verification checks the new payment schema", () => {
    expect(verification).toContain("migration_marker_016_or_newer");
    expect(verification).toContain("payment_accounts_fail_closed");
    expect(verification).toContain("country_payment_accounts_exists");
    expect(verification).toContain("payment_account_sync_trigger_exists");
  });
});
