import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150001_initial_schema.sql"), "utf8");
const completion = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150002_complete_platform.sql"), "utf8");
const controls = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150003_rbac_and_risk_controls.sql"), "utf8");
const ops = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150004_ops_queue.sql"), "utf8");
const workflows = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150005_workflows_levels_chat_batches.sql"), "utf8");
const intelligence = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150006_intelligence_and_dual_control.sql"), "utf8");
const aal2Fx = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150008_staff_rpc_aal2_and_fx_settings.sql"), "utf8");
const customerNotify = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150009_customer_notifications_kyc_resubmit_fx_audit.sql"), "utf8");
const readiness = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150010_production_readiness_hardening.sql"), "utf8");
const kycReason = readFileSync(resolve(process.cwd(), "supabase/migrations/202607150011_kyc_customer_reason_and_data_requests.sql"), "utf8");

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

describe("intelligence and dual-control invariants",()=>{
  it("enables RLS on every new sensitive table",()=>{for(const table of ["compliance_cases","case_checklist_items","approval_requests","merchant_metric_snapshots","saved_views"])expect(intelligence).toContain(`alter table public.${table} enable row level security`)});
  it("requires AAL2 and four eyes for decisions",()=>{expect(intelligence).toContain("MFA_REQUIRED");expect(intelligence).toContain("FOUR_EYES_REQUIRED");expect(intelligence).toContain("decided_by<>requested_by")});
  it("adds no financial execution path",()=>{expect(intelligence).not.toMatch(/settlement_tx_hash\s*=/);expect(intelligence).not.toMatch(/released_at\s*=/);expect(intelligence).toContain("never executes deposits")});
});

describe("staff AAL2 and FX settings migration", () => {
  it("requires AAL2 inside privileged review RPCs", () => {
    expect(aal2Fx).toContain("require_staff_aal2");
    expect(aal2Fx).toContain("review_kyc");
    expect(aal2Fx).toContain("review_payment_proof");
    expect(aal2Fx).toContain("transition_order");
    expect(aal2Fx).toContain("MFA_REQUIRED");
  });

  it("adds indicative FX settings without enabling live trading", () => {
    expect(aal2Fx).toContain("market_fx_settings");
    expect(aal2Fx).toContain("Does not unlock LIVE_TRADING");
    expect(aal2Fx).toContain("LIVE_TRADING_DISABLED");
  });
});

describe("customer notification and KYC resubmit migration", () => {
  it("allows rejected KYC owners to reopen as draft or submitted", () => {
    expect(customerNotify).toContain("kyc_owner_update");
    expect(customerNotify).toContain("'rejected'");
    expect(customerNotify).toContain("status in ('draft', 'submitted')");
  });

  it("notifies customers on KYC, order, proof and support updates", () => {
    expect(customerNotify).toContain("notify_customer_kyc_decision");
    expect(customerNotify).toContain("notify_customer_order_status");
    expect(customerNotify).toContain("notify_customer_proof_decision");
    expect(customerNotify).toContain("notify_customer_ticket_reply");
  });

  it("audits FX settings and never unlocks settlement", () => {
    expect(customerNotify).toContain("audit_market_fx_settings");
    expect(customerNotify).not.toMatch(/live_trading'\s*,\s*'true'/i);
    expect(customerNotify).not.toMatch(/settlement_tx_hash\s*=/);
  });
});

describe("production readiness migration 010", () => {
  it("stores staff role not AAL in audit actor_role", () => {
    expect(readiness).toContain("current_staff_role_label");
    expect(readiness).toContain("actor_label := public.current_staff_role_label()");
    expect(readiness).not.toMatch(/actor_role,\s*auth\.jwt\(\)->>'aal'/);
  });

  it("exposes FX public view without notes or updated_by", () => {
    expect(readiness).toContain("market_fx_public");
    expect(readiness).toContain("select usd_to_iqd, usd_to_aed, updated_at");
    expect(readiness).toContain("update_market_fx");
    expect(readiness).toContain("require_staff_aal2");
  });

  it("scopes staff notification visibility by kind", () => {
    expect(readiness).toContain("notifications_staff_select");
    expect(readiness).toContain("kind in ('support')");
    expect(readiness).toContain("kind in ('kyc','compliance','ops')");
  });
});

describe("migration 011 customer reasons and data requests", () => {
  it("adds customer_reason and internal_review_notes without unlocking trading", () => {
    expect(kycReason).toContain("customer_reason");
    expect(kycReason).toContain("internal_review_notes");
    expect(kycReason).toContain("CUSTOMER_REASON_REQUIRED");
    expect(kycReason).toContain("data_requests");
    expect(kycReason).toContain("kyc_cases_customer");
    expect(kycReason).not.toMatch(/live_trading'\s*,\s*'true'/i);
    expect(kycReason).toContain("value = 'false'::jsonb");
  });

  it("notifications use customer_reason only", () => {
    expect(kycReason).toContain("notify_customer_kyc_decision");
    expect(kycReason).toContain("new.customer_reason");
    expect(kycReason).not.toMatch(/new\.internal_review_notes/);
  });
});
