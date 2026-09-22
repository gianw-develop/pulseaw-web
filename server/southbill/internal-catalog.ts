import { digest, isId, isRecord, requireCondition, SouthbillError } from './invariants.ts';
import { INTERNAL_PRICE_LADDER, allocateInternal } from './internal-allocation.ts';
import type { Service } from './domain.ts';

export type InternalEntry = Readonly<{
  serviceId:string; name:string; description:string; currency:'usd'; unitAmountCents:number;
  deliverable:string; deliveryMethod:string; deliveryDays:number; evidenceType:string;
  refundTreatment:string; refundPolicyUrl:string; taxCategory:string; publicCategory:string;
}>;
export type InternalCatalog = Readonly<{
  schemaVersion:1; accountKey:'pulseaw'; visibility:'private'; pricingPolicy:'exact-37-v1';
  status:'proposed'|'approved'; approval:null|{reference:string; approvedBy:string; approvedAt:string};
  entries:readonly InternalEntry[];
}>;
const prefix='pulseaw-internal-v1-';
export const isInternalVersion=(value:unknown):value is string=>typeof value==='string' && value.startsWith(prefix);
const validText=(v:unknown,max=1600)=>typeof v==='string' && v.trim().length>=3 && v.length<=max;

/** Parse private operator configuration, never browser input. Proposals are preview-only. */
export function parseInternalCatalog(value:unknown,allowProposal=false):InternalCatalog {
  requireCondition(isRecord(value),'INVALID_INTERNAL_CATALOG');
  const doc=value as Record<string,unknown>;
  requireCondition(doc.schemaVersion===1 && doc.accountKey==='pulseaw' && doc.visibility==='private' && doc.pricingPolicy==='exact-37-v1','INTERNAL_CATALOG_IDENTITY_MISMATCH');
  requireCondition(doc.status==='approved' || (allowProposal && doc.status==='proposed'),'INTERNAL_CATALOG_APPROVAL_REQUIRED');
  if(doc.status==='approved'){
    requireCondition(isRecord(doc.approval) && validText(doc.approval.reference) && validText(doc.approval.approvedBy) && typeof doc.approval.approvedAt==='string' && Number.isFinite(Date.parse(doc.approval.approvedAt)),'INTERNAL_CATALOG_APPROVAL_REQUIRED');
  }else requireCondition(doc.approval===null,'INVALID_INTERNAL_CATALOG_APPROVAL');
  requireCondition(Array.isArray(doc.entries) && doc.entries.length===37,'INTERNAL_CATALOG_37_ENTRIES_REQUIRED');
  const entries=doc.entries as Record<string,unknown>[];
  for(const entry of entries){
    requireCondition(isRecord(entry) && isId(entry.serviceId) && String(entry.serviceId).startsWith('internal-'),'INVALID_INTERNAL_SERVICE');
    requireCondition(entry.currency==='usd' && Number.isSafeInteger(entry.unitAmountCents) && INTERNAL_PRICE_LADDER.includes(entry.unitAmountCents as number),'INVALID_INTERNAL_PRICE');
    for(const key of ['name','description','deliverable','deliveryMethod','evidenceType','refundTreatment','taxCategory','publicCategory'])
      requireCondition(validText(entry[key],key==='name'?160:1600),'INTERNAL_SERVICE_DETAILS_REQUIRED');
    requireCondition(Number.isInteger(entry.deliveryDays) && Number(entry.deliveryDays)>=1 && Number(entry.deliveryDays)<=30,'INVALID_INTERNAL_DELIVERY');
    requireCondition(entry.refundPolicyUrl==='https://www.pulseaw.com/refund-policy','INTERNAL_POLICY_REQUIRED');
    requireCondition(!('productId' in entry) && !('priceId' in entry),'INTERNAL_PROVIDER_IDS_NOT_USED');
  }
  requireCondition(new Set(entries.map(x=>x.serviceId)).size===37 && new Set(entries.map(x=>String(x.name).trim().toLowerCase())).size===37,'DUPLICATE_INTERNAL_SERVICE');
  requireCondition(JSON.stringify(entries.map(x=>x.unitAmountCents).sort((a,b)=>Number(a)-Number(b)))===JSON.stringify(INTERNAL_PRICE_LADDER),'INTERNAL_PRICE_LADDER_MISMATCH');
  // Whitelist fields so private configuration cannot inject provider payload properties.
  return Object.freeze({schemaVersion:1,accountKey:'pulseaw',visibility:'private',pricingPolicy:'exact-37-v1',status:doc.status,
    approval:doc.approval===null?null:Object.freeze({...doc.approval as InternalCatalog['approval']}),
    entries:Object.freeze(entries.map(e=>Object.freeze({serviceId:e.serviceId,name:e.name,description:e.description,currency:'usd',unitAmountCents:e.unitAmountCents,
      deliverable:e.deliverable,deliveryMethod:e.deliveryMethod,deliveryDays:e.deliveryDays,evidenceType:e.evidenceType,
      refundTreatment:e.refundTreatment,refundPolicyUrl:e.refundPolicyUrl,taxCategory:e.taxCategory,publicCategory:e.publicCategory})))
  }) as InternalCatalog;
}
export function internalVersion(doc:InternalCatalog):string {
  return prefix+digest({accountKey:doc.accountKey,pricingPolicy:doc.pricingPolicy,entries:[...doc.entries].sort((a,b)=>a.serviceId.localeCompare(b.serviceId))}).slice(0,32);
}
export function internalServices(doc:InternalCatalog):readonly Service[] {
  return Object.freeze([...doc.entries].sort((a,b)=>a.unitAmountCents-b.unitAmountCents).map(e=>Object.freeze({
    serviceId:e.serviceId,name:e.name,currency:e.currency,unitAmountCents:e.unitAmountCents,
    description:e.description+' Deliverable: '+e.deliverable+' '+e.deliveryMethod+' within '+e.deliveryDays+' business day(s) after required client materials are received.',
  })));
}
/** Explicit immutable versions only; a public agreement never falls back to private prices. */
function registeredInternalCatalogs():InternalCatalog[] {
  const raw=process.env.SOUTHBILL_INTERNAL_CATALOG_JSON;
  requireCondition(raw && raw.length<=60000,'INTERNAL_CATALOG_NOT_CONFIGURED');
  let input:unknown;
  try{input=JSON.parse(raw!);}catch{throw new SouthbillError('INVALID_INTERNAL_CATALOG_JSON');}
  requireCondition(isRecord(input) && Array.isArray(input.catalogs) && input.catalogs.length>0 && input.catalogs.length<=10,'INVALID_INTERNAL_CATALOG_REGISTRY');
  const documents=(input as {catalogs:unknown[]}).catalogs.map(x=>parseInternalCatalog(x));
  const versions=documents.map(internalVersion);
  requireCondition(new Set(versions).size===versions.length,'DUPLICATE_INTERNAL_CATALOG_VERSION');
  return documents;
}
export function resolveInternalCatalog(version:string):{document:InternalCatalog;services:readonly Service[]} {
  const document=registeredInternalCatalogs().find(doc=>internalVersion(doc)===version);
  requireCondition(document,'CATALOG_VERSION_MISMATCH');
  return {document:document!,services:internalServices(document!)};
}

/** Authenticated health evidence only: never return private service names or descriptions. */
export function internalCatalogHealth() {
  if (!process.env.SOUTHBILL_INTERNAL_CATALOG_JSON) return {configured:false,versions:[]};
  return {configured:true,versions:registeredInternalCatalogs().map(doc=>{
    const services=internalServices(doc);
    const covered=Array.from({length:195},(_,i)=>(i+6)*100).filter(amount=>allocateInternal(amount,services)!==null).length;
    requireCondition(covered===195,'INTERNAL_CATALOG_COVERAGE_FAILED');
    return {version:internalVersion(doc),serviceCount:services.length,coveredWholeDollarAmounts:covered,minimumUSD:6,maximumUSD:200};
  })};
}
