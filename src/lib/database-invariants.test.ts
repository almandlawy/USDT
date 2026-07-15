import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150001_initial_schema.sql"), "utf8");
const completion = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150002_complete_platform.sql"), "utf8");
const controls = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150003_rbac_and_risk_controls.sql"), "utf8");
const ops = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150004_ops_queue.sql"), "utf8");
const workflows = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150005_workflows_levels_chat_batches.sql"), "utf8");

describe("database launch invariants", () => {
  it("seeds live trading off and protects activation", () => {
    expect(migration).toContain("'live_trading', 'false'::jsonb");
    expect(migration).toContain("create or replace function public.set_live_trading");
    expect(migration).toContain("auth.jwt()->>'aal'");
  });

  it("blocks settlement and P2P release before launch", () => {
    expect(migration).toContain("LIVE_TRADING_DISABLED");
    expect(migration).toContain("automatic or manual crypto release is locked");
  });

  it("keeps audit logs append-only and storage private", () => {
    expect(migration).toContain("Audit logs are immutable");
    expect(migration).toContain("('kyc-documents', 'kyc-documents', false");
    expect(migration).toContain("alter table public.audit_logs enable row level security");
  });

  it("keeps completion tables behind RLS and evidence storage private", () => {
    for (const table of ["business_profiles","feature_flags","legal_content","legal_acceptances","wallet_addresses","login_events","p2p_evidence"]) expect(completion).toContain(`alter table public.${table} enable row level security`);
    expect(completion).toContain("('p2p-evidence','p2p-evidence',false");
    expect(completion).toContain("grant execute on function public.review_kyc");
    expect(completion).toContain("grant execute on function public.transition_order");
  });

  it("requires Super Admin, AAL2 and a legal reference for activation", () => {
    expect(completion).toContain("has_staff_role(array['super_admin']");
    expect(completion).toContain("auth.jwt()->>'aal'");
    expect(completion).toContain("LEGAL_APPROVAL_REFERENCE_REQUIRED");
    expect(completion).toContain("if _enabled");
  });

  it("protects dedicated merchant, fee, limit and risk tables with RLS", () => {
    for(const table of ["p2p_merchants","fee_rules","limit_rules","risk_flags"]){
      expect(controls).toContain(`create table public.${table}`);
      expect(controls).toContain(`alter table public.${table} enable row level security`);
      expect(controls).toContain(`audit_${table}`);
    }
    expect(controls).not.toContain("service_role");
  });
});

describe("operations workflow invariants",()=>{
  it("protects assignments with AAL2 and auditing",()=>{expect(ops).toContain("MFA_REQUIRED");expect(ops).toContain("assign_ops_item");expect(ops).toContain("audit_logs")});
  it("enforces KYC caps in the database",()=>{expect(workflows).toContain("orders_level_limit");expect(workflows).toContain("KYC_LEVEL_LIMIT_EXCEEDED")});
  it("enables RLS for chat and batches",()=>{expect(workflows).toContain("alter table public.order_messages enable row level security");expect(workflows).toContain("alter table public.review_batches enable row level security")});
  it("does not implement settlement or release",()=>{expect(workflows).not.toMatch(/settlement_tx_hash\s*=/);expect(workflows).not.toMatch(/released_at\s*=/)});
});
