"use client";

import { useMemo, useState } from "react";
import { evaluatePassword } from "@/lib/security/password";

export function PasswordStrengthField({
  locale,
  name = "password",
  autoComplete = "new-password",
  confirmName,
}: {
  locale: "ar" | "en";
  name?: string;
  autoComplete?: string;
  confirmName?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const strength = useMemo(() => evaluatePassword(password), [password]);
  const ar = locale === "ar";
  const mismatch = confirmName ? confirm.length > 0 && confirm !== password : false;

  return (
    <>
      <label>
        <span>{ar ? "كلمة المرور" : "Password"}</span>
        <input
          name={name}
          type="password"
          autoComplete={autoComplete}
          minLength={12}
          required
          dir="ltr"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-strength"
        />
        <div id="password-strength" className={`passwordStrength score-${strength.score}`} aria-live="polite">
          <i style={{ width: `${(strength.score / 4) * 100}%` }} />
          <small>{ar ? strength.labelAr : strength.labelEn}</small>
        </div>
        <small>
          {ar
            ? "12 حرفاً على الأقل، حرف كبير وصغير ورقم ورمز خاص."
            : "At least 12 characters with upper, lower, number and special symbol."}
        </small>
      </label>
      {confirmName ? (
        <label>
          <span>{ar ? "تأكيد كلمة المرور" : "Confirm password"}</span>
          <input
            name={confirmName}
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            dir="ltr"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            aria-invalid={mismatch}
          />
          {mismatch ? <small className="fieldError">{ar ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."}</small> : null}
        </label>
      ) : null}
    </>
  );
}
