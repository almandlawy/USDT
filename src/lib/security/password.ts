const COMMON = new Set([
  "password", "password123", "password123!", "123456789012", "qwertyuiopas",
  "letmein12345", "welcome12345", "adminadmin12", "gulfgate1234", "changeme123!",
]);

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  labelAr: string;
  labelEn: string;
  ok: boolean;
  issues: string[];
};

export function evaluatePassword(password: string): PasswordStrength {
  const issues: string[] = [];
  if (password.length < 12) issues.push("min_length");
  if (!/[a-z]/.test(password)) issues.push("lower");
  if (!/[A-Z]/.test(password)) issues.push("upper");
  if (!/\d/.test(password)) issues.push("digit");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("special");
  if (COMMON.has(password.toLowerCase())) issues.push("common");

  let score: PasswordStrength["score"] = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 16 && issues.length === 0) score++;
  if (score > 4) score = 4;

  const ok = issues.length === 0;
  const labels = [
    { ar: "ضعيفة جداً", en: "Very weak" },
    { ar: "ضعيفة", en: "Weak" },
    { ar: "متوسطة", en: "Fair" },
    { ar: "جيدة", en: "Good" },
    { ar: "قوية", en: "Strong" },
  ] as const;
  const label = labels[ok ? Math.max(score, 3) : Math.min(score, 2)];
  return { score: ok ? (score as PasswordStrength["score"]) : (Math.min(score, 2) as PasswordStrength["score"]), labelAr: label.ar, labelEn: label.en, ok, issues };
}
