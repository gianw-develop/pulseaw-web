import { createHash } from 'node:crypto';
import { requireCondition } from './invariants.ts';
import type { Line, Service } from './domain.ts';

export const INTERNAL_PRICE_LADDER = Object.freeze([
  ...Array.from({length:30},(_,i)=>(i+6)*100),4300,4400,4500,4600,4700,4800,4900,
]);

/** Private exact-allocation policy v1: quantity one, <=5 lines, >=3 from $80.
 * Below $80 prefer fewer lines. At $80+ prefer more lines, then lower maximum,
 * smaller spread and sum of squares. Stable hashes settle ties; no rotation.
 */
export function allocateInternal(amountCents:number,eligible:readonly Service[]):Line[]|null {
  requireCondition(Number.isSafeInteger(amountCents) && amountCents%100===0 && amountCents>=600 && amountCents<=20000,'INTERNAL_AMOUNT_RANGE_6_200_REQUIRED');
  requireCondition(eligible.length>0 && eligible.length<=37 && new Set(eligible.map(x=>x.serviceId)).size===eligible.length,'INVALID_INTERNAL_SCOPE');
  requireCondition(eligible.every(x=>x.currency==='usd' && INTERNAL_PRICE_LADDER.includes(x.unitAmountCents)),'INVALID_INTERNAL_PRICE');
  const services=[...eligible].sort((a,b)=>b.unitAmountCents-a.unitAmountCents || a.serviceId.localeCompare(b.serviceId));
  const minimum=amountCents>=8000?3:1;
  let best:Service[]|null=null;
  const hash=(items:readonly Service[])=>createHash('sha256').update(items.map(x=>x.serviceId+':1').sort().join('|')).digest('hex');
  function compare(candidate:Service[],current:Service[]):number {
    if(candidate.length!==current.length)return amountCents>=8000?current.length-candidate.length:candidate.length-current.length;
    if(amountCents>=8000){
      const max=candidate[0].unitAmountCents-current[0].unitAmountCents;if(max)return max;
      const spread=(candidate[0].unitAmountCents-candidate.at(-1)!.unitAmountCents)-(current[0].unitAmountCents-current.at(-1)!.unitAmountCents);if(spread)return spread;
      const squares=candidate.reduce((s,x)=>s+x.unitAmountCents**2,0)-current.reduce((s,x)=>s+x.unitAmountCents**2,0);if(squares)return squares;
    }
    return hash(candidate).localeCompare(hash(current));
  }
  const selected:Service[]=[];
  function search(start:number,total:number):void {
    if(total===amountCents){
      if(selected.length>=minimum && (!best || compare(selected,best)<0))best=[...selected];
      return;
    }
    if(selected.length===5 || start===services.length)return;
    // Even the most expensive remaining items cannot fill this amount.
    const maximum=services.slice(start,start+5-selected.length).reduce((s,x)=>s+x.unitAmountCents,total);
    if(maximum<amountCents)return;
    for(let i=start;i<services.length;i++){
      const next=total+services[i].unitAmountCents;
      if(next>amountCents)continue;
      selected.push(services[i]);search(i+1,next);selected.pop();
    }
  }
  search(0,0);
  return (best as Service[]|null)?.map(item=>({...item,quantity:1}))??null;
}
