"use client";

import { useMemo, useState } from "react";
import type { CountryRecord } from "@/lib/countries/catalog";
import { countryDisplayName } from "@/lib/countries/catalog";

export function CountrySelector({
  locale,
  countries,
  suggestedCode,
  value,
  onChange,
}: {
  locale: "ar" | "en";
  countries: CountryRecord[];
  suggestedCode?: string | null;
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const ar = locale === "ar";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => {
      const hay = `${c.code} ${c.name_ar} ${c.name_en} ${c.currency_code}`.toLowerCase();
      return hay.includes(q);
    });
  }, [countries, query]);

  return (
    <div className="countrySelector">
      <label className="countrySelectorLabel" htmlFor="country-search">
        {ar ? "اختر دولة الدفع" : "Choose payment country"}
      </label>
      {suggestedCode ? (
        <p className="countrySuggest">
          {ar ? "اقتراح تلقائي (يمكن تعديله):" : "Suggested (you can change it):"}{" "}
          <button type="button" className="textButton" onClick={() => onChange(suggestedCode)}>
            {suggestedCode}
          </button>
        </p>
      ) : null}
      <input
        id="country-search"
        className="fieldInput"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={ar ? "ابحث عن الدولة…" : "Search countries…"}
        autoComplete="off"
      />
      <ul className="countryList" role="listbox" aria-label={ar ? "قائمة الدول" : "Country list"}>
        {filtered.map((country) => {
          const selected = country.code === value;
          const blocked = country.sanctions_blocked || country.risk_level === "blocked" || !country.enabled;
          return (
            <li key={country.code}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={`countryOption${selected ? " isSelected" : ""}${blocked ? " isBlocked" : ""}`}
                disabled={blocked}
                onClick={() => onChange(country.code)}
              >
                <span className="countryName">{countryDisplayName(country, locale)}</span>
                <span className="countryMeta">
                  {country.code} · {country.currency_code}
                  {country.dialing_code ? ` · ${country.dialing_code}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
