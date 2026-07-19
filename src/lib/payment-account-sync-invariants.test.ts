import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routing = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202607150015_iraq_uae_payment_routing_correction.sql"),
  "utf8",
);
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202607150016_payment_account_fail_closed_sync.sql"),
  "utf8",
);
const verification = readFileSync(resolve(process.cwd(), "supabase/verify-production.sql"), "utf8");

describe("migration 015 payment routing integrity", () => {
  it("allows disabled provider rows without breaking a clean migration", () => {
    expect(routing).toContain("integration_mode in ('api', 'manual', 'disabled')");
    expect(routing).toContain("country_payment_accounts_integration_mode_check");
    expect(routing).toContain("('AE', 'stripe_card', 'Stripe', 'Stripe', 'disabled', false");
  });

  it("seeds all country account placeholders disabled", () => {
    expect(routing).toContain("('IQ', 'fib', 'FIB', 'FIB', 'manual', false");
    expect(routing).toContain("('IQ', 'superqi', 'SuperQi', 'SuperQi', 'manual', false");
    expect(routing).toContain("('AE', 'eand_money', 'e& money', 'e& money', 'manual', false");
    expect(routing).toContain("select pm.id, 'IQ', 'IQD', false");
  });
});

describe("migration 016 payment account fail-closed sync", () => {
  it("enforces details for enabled manual payment accounts", () => {
    expect(migration).toContain("enforce_country_payment_account_ready");
    expect(migration).toContain("PAYMENT_ACCOUNT_DETAILS_REQUIRED");
    expect(migration).toContain("account_payload_encrypted");
    expect(migration).toContain("qr_storage_path");
  });

  it("rejects API mode for providers without an implemented adapter", () => {
    expect(migration).toContain("API_MODE_NOT_IMPLEMENTED_FOR_PAYMENT_METHOD");
    expect(migration).toContain("not in ('stripe_card', 'zain_cash')");
  });

  it("syncs configured country accounts into the public availability matrix", () => {
    expect(migration).toContain("sync_country_payment_account_availability");
    expect(migration).toContain("payment_method_availability");
    expect(migration).toContain("requires_proof");
    expect(migration).toContain("requires_redirect");
    expect(migration).toContain("set enabled = enabled");
  });

  it("keeps live trading false and advances the migration marker", () => {
    expect(migration).toContain("202607150016");
    expect(migration).toContain("where key = 'live_trading'");
    expect(migration).not.toMatch(/live_trading[^\n]*true/i);
  });

  it("production verification checks the new payment schema and data state", () => {
    expect(verification).toContain("migration_marker_016_or_newer");
    expect(verification).toContain("payment_accounts_fail_closed");
    expect(verification).toContain("country_payment_accounts_exists");
    expect(verification).toContain("payment_account_enforcement_trigger_exists");
    expect(verification).toContain("payment_account_sync_trigger_exists");
    expect(verification).toContain("no_empty_enabled_manual_accounts");
    expect(verification).toContain("no_unsupported_api_accounts");
  });
});
