import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production" || process.env.ALLOW_TEST_SEED !== "true") throw new Error("Test seeding is disabled. Use a non-production project and ALLOW_TEST_SEED=true");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; const password = process.env.TEST_USER_PASSWORD;
if (!url || !key || !password || password.length < 16) throw new Error("Missing Supabase values or strong TEST_USER_PASSWORD");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const accounts = [{ email: "customer@example.test", role: null }, { email: "admin@example.test", role: "super_admin" }, { email: "compliance@example.test", role: "compliance" }, { email: "reviewer@example.test", role: "reviewer" }, { email: "support@example.test", role: "support" }] as const;
const created: Record<string,string> = {};
for (const account of accounts) {
  const { data, error } = await supabase.auth.admin.createUser({ email: account.email, password, email_confirm: true, user_metadata: { display_name: account.email.split("@")[0], preferred_locale: "en", terms_accepted: true, terms_version: "2026-07-15" } });
  if (error || !data.user) throw error || new Error(`Could not create ${account.email}`);
  if (account.role) { const { error: roleError } = await supabase.from("staff_roles").insert({ user_id: data.user.id, role: account.role }); if (roleError) throw roleError; }
  created[account.email]=data.user.id;
  console.log(`Created ${account.email} (${account.role || "customer"})`);
}
const {data:method}=await supabase.from("payment_methods").select("id").eq("code","fib").single();
if(method){
  const now=new Date(), expiry=new Date(now.getTime()+10*60_000);
  const {error}=await supabase.from("orders").insert([
    {user_id:created["customer@example.test"],reference_number:`GG-DEMO-BUY-${Date.now()}`,order_type:"buy",status:"awaiting_kyc",fiat_currency:"IQD",amount_fiat:150000,network:"TRC20",wallet_address:"T123456789ABCDEFGHJKLMNPQRSTUVWXYZ",transaction_purpose:"Seeded demo request",quote_rate:1310,fee_amount:1500,total_amount:151500,quote_expires_at:expiry.toISOString(),payment_method_id:method.id,is_demo:true},
    {user_id:created["customer@example.test"],reference_number:`GG-DEMO-SELL-${Date.now()+1}`,order_type:"sell",status:"under_review",fiat_currency:"USD",amount_fiat:250,network:"ERC20",wallet_address:"0x1111111111111111111111111111111111111111",transaction_purpose:"Seeded demo request",quote_rate:1,fee_amount:2.5,total_amount:247.5,quote_expires_at:expiry.toISOString(),payment_method_id:method.id,is_demo:true},
  ]);
  if(error) throw error;
  console.log("Created seeded demo orders");
}
