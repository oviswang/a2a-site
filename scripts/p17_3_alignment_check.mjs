#!/usr/bin/env node
// P17-3 alignment check (MVP)
// Goal: detect obvious drift between REQUIRED_RUNS (source of truth) and docs/checklist.

import fs from 'node:fs';

const completionPath = 'scripts/p13_1_regression_completion.mjs';
const requiredDoc = 'docs/p11-3-required-regressions.md';
const checklistDoc = 'docs/p12-release-checklist.md';

function read(p){ return fs.readFileSync(p,'utf8'); }

function extractRequiredRuns(txt){
  const m = txt.match(/const REQUIRED_RUNS = \{([\s\S]*?)\n\};/);
  if(!m) throw new Error('REQUIRED_RUNS block not found');
  const body=m[1];
  const map=new Map();
  let current=null;
  for(const line of body.split(/\r?\n/)){
    const k=line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*\[/);
    if(k){ current=k[1]; map.set(current,[]); continue; }
    if(!current) continue;
    const ev=line.match(/evidenceDirSuffix:\s*'([^']+)'/);
    if(ev) map.get(current).push(ev[1]);
  }
  return map;
}

function loosen(s){
  // allow docs to use ... shorthand for evidence paths
  return String(s).replace(/artifacts\/evidence\//g,'').split('/cases/').pop();
}

function containsAll(docText, needles){
  const missing=[];
  for(const n of needles){
    if(docText.includes(n)) continue;
    const loose = loosen(n);
    if(loose && docText.includes(loose)) continue;
    missing.push(n);
  }
  return missing;
}

function main(){
  const comp=read(completionPath);
  const req=read(requiredDoc);
  const chk=read(checklistDoc);

  const rr=extractRequiredRuns(comp);
  const out=[];
  for(const [ct, evidences] of rr.entries()){
    const missingInReq=containsAll(req, evidences);
    const missingInChk=containsAll(chk, evidences);
    out.push({ changeType: ct, requiredEvidences: evidences, missingInRequiredRegressionsDoc: missingInReq, missingInChecklist: missingInChk });
  }

  const hasDrift = out.some(x=>x.missingInRequiredRegressionsDoc.length>0 || x.missingInChecklist.length>0);
  const report={ ok:true, kind:'p17_3_alignment_check', sourceOfTruth:'scripts/p13_1_regression_completion.mjs#REQUIRED_RUNS', hasDrift, report: out };
  fs.writeFileSync('artifacts/examples/p17-3-alignment-check.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}

main();
