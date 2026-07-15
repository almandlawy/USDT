import { ImageResponse } from "next/og";

export const alt = "Gulf Gate — managed digital asset requests in pre-launch mode";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{background:"#06111f",color:"#f7f3e8",width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"72px",fontFamily:"sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:480,height:480,borderRadius:999,background:"rgba(32, 211, 238, .16)",filter:"blur(28px)",top:-240,right:-80}} />
      <div style={{position:"absolute",width:420,height:420,borderRadius:999,background:"rgba(212, 172, 72, .13)",filter:"blur(24px)",bottom:-250,left:-80}} />
      <div style={{display:"flex",alignItems:"center",gap:22}}>
        <div style={{width:70,height:70,border:"2px solid #d4ac48",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",color:"#d4ac48",fontSize:34,fontWeight:800}}>G</div>
        <div style={{fontSize:42,fontWeight:800,letterSpacing:1}}>GULF GATE</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:20,maxWidth:950}}>
        <div style={{color:"#27d3ee",fontSize:23,letterSpacing:3}}>CONTROLLED · BILINGUAL · PRE-LAUNCH</div>
        <div style={{fontSize:64,fontWeight:750,lineHeight:1.1}}>Managed digital asset requests, built around trust.</div>
        <div style={{fontSize:26,color:"#aebaca"}}>USDT requests · KYC · Payment evidence · Managed P2P</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,color:"#d4ac48",fontSize:21}}>
        <div style={{width:10,height:10,borderRadius:99,background:"#d4ac48"}} />
        No deposits, payouts, transfers or asset release
      </div>
    </div>,
    size,
  );
}

