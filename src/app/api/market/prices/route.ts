import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/market-data";

export const dynamic="force-dynamic";

export async function GET(){
  const data=await getMarketSnapshot();
  return NextResponse.json(data,{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=300"}});
}
