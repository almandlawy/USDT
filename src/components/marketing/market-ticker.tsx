"use client";

import { useEffect,useState } from "react";
import { Activity,RefreshCw,TriangleAlert } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-data";
import type { Locale } from "@/lib/constants";

export function MarketTicker({locale,initial}:{locale:Locale;initial:MarketSnapshot}){
  const [snapshot,setSnapshot]=useState(initial),[loading,setLoading]=useState(false);const ar=locale==="ar";
  async function refresh(){setLoading(true);try{const response=await fetch("/api/market/prices",{cache:"no-store"});if(response.ok)setSnapshot(await response.json())}finally{setLoading(false)}}
  useEffect(()=>{const timer=setInterval(refresh,60_000);return()=>clearInterval(timer)},[]);
  return <section className="marketStrip" aria-label={ar?"أسعار العملات الرقمية الحية":"Live cryptocurrency prices"}><div className="shell marketStripInner"><div className="marketLabel"><Activity/><span><b>{ar?"أسعار حيّة":"Live market"}</b><small>{snapshot.stale?(ar?"بيانات احتياطية — المزوّد غير متاح":"Fallback data — provider unavailable"):(ar?"تحديث تلقائي كل دقيقة":"Automatically refreshed every minute")}</small></span></div><div className="marketAssets">{snapshot.assets.map(asset=><article key={asset.symbol}><span>{asset.symbol}<small>{asset.name}</small></span><strong>${asset.usd<10?asset.usd.toFixed(4):asset.usd.toLocaleString("en-US",{maximumFractionDigits:2})}</strong><em className={(asset.change24h||0)>=0?"up":"down"}>{asset.change24h==null?"—":`${asset.change24h>=0?"+":""}${asset.change24h.toFixed(2)}%`}</em>{asset.symbol==="USDT"&&<small>{asset.aed.toFixed(4)} AED · {asset.iqd.toLocaleString("en-US",{maximumFractionDigits:2})} IQD</small>}</article>)}</div><button className="marketRefresh" onClick={refresh} disabled={loading} aria-label={ar?"تحديث الأسعار":"Refresh prices"}>{snapshot.stale?<TriangleAlert/>:<RefreshCw className={loading?"spinning":""}/>}</button></div><p className="marketDisclaimer shell">{ar?"أسعار سوق استرشادية من CoinGecko وليست عرض شراء أو بيع ملزماً. لا يتم تنفيذ معاملات.":"Indicative CoinGecko market data, not a binding buy or sell quote. No transactions are executed."}</p></section>
}
