"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export function QuoteCountdown({ expiresAt, locale }: { expiresAt: string | null; locale: "ar"|"en" }) {
  const [seconds,setSeconds]=useState(()=>expiresAt?Math.max(0,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000)):0);
  useEffect(()=>{const timer=setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);return()=>clearInterval(timer);},[]);
  return <span className={seconds?"quoteTimer":"quoteTimer expired"}><Clock3/>{seconds?`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`:(locale==="ar"?"انتهى العرض":"Quote expired")}</span>;
}
