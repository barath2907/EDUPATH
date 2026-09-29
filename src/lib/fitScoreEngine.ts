/**
 * EduPath — Personalized Fit Score Engine
 * Computes a 0–100 Personalized Fit Score. NOT an admission probability.
 * Weights: Cutoff 40%, Branch 20%, ML 15%, Location 10%, Budget 10%, Trend 5%
 * Classifications: 90-100 STRONG MATCH | 75-89 MATCH | 60-74 COMPETITIVE | 40-59 CHALLENGING | 0-39 LOW MATCH
 */

export interface FitScoreInput {
  studentCutoff: number;
  studentCategory: string;
  preferredBranches?: string[];
  preferredDistrict?: string;
  budget?: number;
  isGovernmentSchool75Quota?: boolean;
  branchCode: string;
  branchName: string;
  district: string;
  collegeType: string;
  historicalCutoff2023: number;
  historicalCutoff2024: number;
  historicalCutoff2025?: number;
  annualFees?: number;
  mlPredictionScore?: number;
}

export interface FitDimensions {
  cutoffCompatibility: number;
  branchPreference: number;
  mlSuitability: number;
  locationFit: number;
  budgetFit: number;
  historicalTrend: number;
}

export type FitClassification = 'STRONG MATCH'|'MATCH'|'COMPETITIVE'|'CHALLENGING'|'LOW MATCH'|'DATA INSUFFICIENT';

export interface FitScoreResult {
  total: number;
  classification: FitClassification;
  label: string;
  dimensions: FitDimensions;
  explanation: string;
}

const W = { cutoff:40, branch:20, ml:15, location:10, budget:10, trend:5 };

export function computeFitScore(inp: FitScoreInput): FitScoreResult {
  const latestCutoff = inp.historicalCutoff2025 || inp.historicalCutoff2024 || inp.historicalCutoff2023;
  const eff = inp.isGovernmentSchool75Quota ? Math.min(200, inp.studentCutoff+6.5) : inp.studentCutoff;
  const margin = eff - latestCutoff;

  let cr=0;
  if(margin>=8) cr=1; else if(margin>=4) cr=0.92; else if(margin>=2) cr=0.82;
  else if(margin>=0) cr=0.70; else if(margin>=-2) cr=0.48; else if(margin>=-5) cr=0.25;
  else if(margin>=-10) cr=0.10; else cr=0.02;
  const cutoffScore = parseFloat((cr*W.cutoff).toFixed(2));

  let br=0;
  if(inp.preferredBranches && inp.preferredBranches.length>0) {
    br = inp.preferredBranches.includes(inp.branchCode) ? 1.0 : 0.30;
  } else { br=0.60; }
  const branchScore = parseFloat((br*W.branch).toFixed(2));

  let mlr=0;
  if(inp.mlPredictionScore!==undefined) { mlr=inp.mlPredictionScore/100; }
  else { if(margin>=2) mlr=0.85; else if(margin>=0) mlr=0.65; else if(margin>=-2) mlr=0.40; else mlr=0.20; }
  const mlScore = parseFloat((mlr*W.ml).toFixed(2));

  let lr=0;
  if(!inp.preferredDistrict||inp.preferredDistrict==='All') lr=0.70;
  else if(inp.district.toLowerCase()===inp.preferredDistrict.toLowerCase()) lr=1.0;
  else lr=0.25;
  const locationScore = parseFloat((lr*W.location).toFixed(2));

  let bur=0;
  const fees=inp.annualFees??0;
  if(!inp.budget||inp.budget<=0) bur=0.70;
  else if(fees<=inp.budget*0.6) bur=1.0;
  else if(fees<=inp.budget*0.85) bur=0.80;
  else if(fees<=inp.budget) bur=0.60;
  else if(fees<=inp.budget*1.2) bur=0.30;
  else bur=0.05;
  const budgetScore = parseFloat((bur*W.budget).toFixed(2));

  const t24 = inp.historicalCutoff2024 - inp.historicalCutoff2023;
  const t25 = (inp.historicalCutoff2025??inp.historicalCutoff2024) - inp.historicalCutoff2024;
  const avgTrend = (t24+t25)/2;
  let tr=0;
  if(avgTrend<=-1) tr=1.0; else if(avgTrend<=0) tr=0.80; else if(avgTrend<=1) tr=0.60;
  else if(avgTrend<=2) tr=0.35; else tr=0.15;
  const trendScore = parseFloat((tr*W.trend).toFixed(2));

  const total = Math.min(100, Math.max(0, Math.round(cutoffScore+branchScore+mlScore+locationScore+budgetScore+trendScore)));

  const classification: FitClassification = total>=90?'STRONG MATCH':total>=75?'MATCH':total>=60?'COMPETITIVE':total>=40?'CHALLENGING':'LOW MATCH';
  const labelMap: Record<FitClassification,string> = {'STRONG MATCH':'Strong Match','MATCH':'Match','COMPETITIVE':'Competitive','CHALLENGING':'Challenging','LOW MATCH':'Low Match','DATA INSUFFICIENT':'Insufficient Data'};

  const parts: string[] = [];
  if(margin>=2) parts.push(`Your cutoff is ${margin} above the 2024 historical threshold.`);
  else if(margin>=0) parts.push(`Your cutoff closely matches the 2024 threshold (margin: +${margin}).`);
  else parts.push(`Your cutoff is ${Math.abs(margin).toFixed(1)} marks below the 2024 threshold — competitive option.`);
  if(inp.preferredBranches?.includes(inp.branchCode)) parts.push(`${inp.branchName} matches your branch preference.`);
  else if(inp.preferredBranches?.length) parts.push(`${inp.branchName} is not in your preferred branches but may be worth considering.`);
  if(inp.preferredDistrict && inp.district.toLowerCase()===inp.preferredDistrict.toLowerCase()) parts.push(`Located in your preferred district (${inp.preferredDistrict}).`);
  if(avgTrend<0) parts.push('Historical cutoff trend is declining — may become slightly easier.');
  else if(avgTrend>1.5) parts.push('Historical cutoff is rising — becoming more competitive each year.');
  if(!inp.budget||(fees<=inp.budget)) parts.push('Annual fees are within your stated budget.');

  return { total, classification, label: labelMap[classification], dimensions:{ cutoffCompatibility:cutoffScore, branchPreference:branchScore, mlSuitability:mlScore, locationFit:locationScore, budgetFit:budgetScore, historicalTrend:trendScore }, explanation: parts.join(' ')||'Evaluation based on available TNEA data.' };
}

export function getClassificationColor(c: FitClassification): { bg:string; text:string; border:string } {
  switch(c) {
    case 'STRONG MATCH': return { bg:'#ecfdf5', text:'#065f46', border:'#6ee7b7' };
    case 'MATCH':        return { bg:'#fffbeb', text:'#92400e', border:'#fcd34d' };
    case 'COMPETITIVE':  return { bg:'#eff6ff', text:'#1e40af', border:'#93c5fd' };
    case 'CHALLENGING':  return { bg:'#fff7ed', text:'#9a3412', border:'#fdba74' };
    case 'LOW MATCH':    return { bg:'#fef2f2', text:'#991b1b', border:'#fca5a5' };
    default:             return { bg:'#f8fafc', text:'#475569', border:'#cbd5e1' };
  }
}
