# Gulf Gate — Google SEO setup

Last reviewed: 2026-07-15

## What the application now provides

- Absolute canonical URLs that never fall back to localhost in production.
- Reciprocal Arabic and English `hreflang` annotations plus `x-default`.
- Indexable public home and legal pages only.
- `noindex, nofollow` on authentication, customer dashboard, and administration routes.
- A clean XML sitemap with only public canonical pages and language alternates.
- `robots.txt` that protects private/application routes and advertises the sitemap.
- Localized titles and descriptions, Open Graph/Twitter metadata, and a generated 1200×630 share image.
- JSON-LD for the organization, website, pre-launch service, and the visible FAQ content.
- Correct `lang`/`dir`, a single homepage H1, mobile navigation, keyboard focus, skip link, and reduced-motion support.

## Manual Google steps — not performed automatically

1. Choose the permanent public domain. A branded domain is preferable to a temporary `vercel.app` hostname.
2. Add that domain to Vercel and set the required DNS only after explicit approval.
3. Set `NEXT_PUBLIC_APP_URL` to the exact HTTPS origin only after the domain is live. This affects canonical, Open Graph, sitemap, and robots URLs.
4. Create a Google Search Console **Domain property** for the permanent domain.
5. Copy Google's TXT verification record, review it, then add it to DNS after approval.
6. Submit `https://<permanent-domain>/sitemap.xml` in Search Console.
7. Inspect the Arabic and English home URLs and request indexing once. Submission is a discovery hint, not a ranking or indexing guarantee.
8. Monitor Pages, Core Web Vitals, HTTPS, Manual Actions, Security Issues, and Enhancements weekly during launch.

## Proposed configuration requiring approval

Do not apply these until the custom domain is connected and verified:

```dotenv
NEXT_PUBLIC_APP_URL=https://gulfgatecargotrading.com
```

Google's DNS verification token is not an application environment variable. It belongs in the domain's DNS as a TXT record and must be reviewed before insertion.

## Content roadmap

- Publish legally reviewed Arabic and English pages explaining KYC, managed P2P, supported networks, fees, and request lifecycle.
- Add real business identity and contact details only after they are approved for publication.
- Avoid pages that imply a licence, live exchange, guaranteed rates, custody, or execution.
- Earn relevant local citations and links through legitimate business profiles and partners; do not buy bulk backlinks.

