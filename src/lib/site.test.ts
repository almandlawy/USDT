import { afterEach, describe, expect, it } from "vitest";
import { getSiteOrigin, PRODUCTION_ORIGIN } from "./site";

const originalAppUrl=process.env.NEXT_PUBLIC_APP_URL;
const originalVercelUrl=process.env.VERCEL_PROJECT_PRODUCTION_URL;

afterEach(()=>{
  if(originalAppUrl===undefined)delete process.env.NEXT_PUBLIC_APP_URL;else process.env.NEXT_PUBLIC_APP_URL=originalAppUrl;
  if(originalVercelUrl===undefined)delete process.env.VERCEL_PROJECT_PRODUCTION_URL;else process.env.VERCEL_PROJECT_PRODUCTION_URL=originalVercelUrl;
});

describe("SEO site origin",()=>{
  it("uses the explicitly configured public URL and strips a trailing slash",()=>{
    process.env.NEXT_PUBLIC_APP_URL="https://gulfgate.example/";
    expect(getSiteOrigin()).toBe("https://gulfgate.example");
  });

  it("never emits localhost when Vercel provides the production domain",()=>{
    process.env.NEXT_PUBLIC_APP_URL="http://localhost:3000";
    process.env.VERCEL_PROJECT_PRODUCTION_URL="gulf-gate-platform.vercel.app";
    expect(getSiteOrigin()).toBe(PRODUCTION_ORIGIN);
  });
});
