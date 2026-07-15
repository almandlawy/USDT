import "server-only";

export type MarketAsset = { symbol:string; name:string; usd:number; aed:number; iqd:number; change24h:number|null; updatedAt:string };
export type MarketSnapshot = { assets:MarketAsset[]; source:"coingecko"|"fallback"; stale:boolean; fetchedAt:string };

const coins=[
  {id:"tether",symbol:"USDT",name:"Tether"},
  {id:"bitcoin",symbol:"BTC",name:"Bitcoin"},
  {id:"ethereum",symbol:"ETH",name:"Ethereum"},
  {id:"usd-coin",symbol:"USDC",name:"USD Coin"},
] as const;

export async function getMarketSnapshot():Promise<MarketSnapshot>{
  const key=process.env.COINGECKO_DEMO_API_KEY?.trim();
  const url="https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum,usd-coin&vs_currencies=usd,aed,iqd&include_24hr_change=true&include_last_updated_at=true&precision=full";
  try{
    const response=await fetch(url,{headers:key?{"x-cg-demo-api-key":key}:{},next:{revalidate:60}});
    if(!response.ok)throw new Error(`MARKET_PROVIDER_${response.status}`);
    const body=await response.json() as Record<string,Record<string,number|null>>;
    const assets=coins.map(coin=>{const row=body[coin.id];if(!row||typeof row.usd!=="number")throw new Error("INVALID_MARKET_RESPONSE");return {symbol:coin.symbol,name:coin.name,usd:row.usd,aed:Number(row.aed||0),iqd:Number(row.iqd||0),change24h:typeof row.usd_24h_change==="number"?row.usd_24h_change:null,updatedAt:new Date(Number(row.last_updated_at||Date.now()/1000)*1000).toISOString()};});
    return {assets,source:"coingecko",stale:false,fetchedAt:new Date().toISOString()};
  }catch{
    const now=new Date().toISOString();
    return {assets:[{symbol:"USDT",name:"Tether",usd:1,aed:3.6725,iqd:1310,change24h:null,updatedAt:now}],source:"fallback",stale:true,fetchedAt:now};
  }
}
