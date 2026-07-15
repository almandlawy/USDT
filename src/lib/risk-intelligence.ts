export type RiskBand="low"|"medium"|"high"|"critical";
export function riskBand(score:number):RiskBand{if(score>=75)return"critical";if(score>=50)return"high";if(score>=25)return"medium";return"low"}
export function slaHours(score:number,priority?:string){if(priority==="urgent"||score>=75)return 4;if(priority==="high"||score>=50)return 12;return 24}
export function merchantHealth(input:{completionRate:number;appealRate:number;positiveFeedbackRate:number;responseScore:number}){const raw=input.completionRate*.35+(100-Math.min(100,input.appealRate*10))*.25+input.positiveFeedbackRate*.25+input.responseScore*.15;return Math.max(0,Math.min(100,Math.round(raw*100)/100))}
