import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!url || !serviceKey || !email || !password) throw new Error("Missing Supabase or SEED_ADMIN_* environment variables");
if (email.endsWith("@example.test") || password.includes("ChangeMe") || password.length < 16) throw new Error("Use a real admin email and a unique password of at least 16 characters");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Gulf Gate Super Admin", preferred_locale: "ar", terms_accepted: true, terms_version: "2026-07-15" } });
if (error || !data.user) throw error || new Error("Admin creation failed");
const { error: roleError } = await supabase.from("staff_roles").insert({ user_id: data.user.id, role: "super_admin", granted_by: data.user.id });
if (roleError) throw roleError;
console.log(`Created Super Admin ${data.user.id}. Enroll TOTP immediately, then remove seed credentials.`);
