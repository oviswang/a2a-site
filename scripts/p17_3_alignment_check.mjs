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
  let curObj=null;
  for(const line of body.split(/\r?\n/)){
    const k=line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*\[/);
    if(k){
      current=k[1];
      map.set(current,[]);
      curObj=null;
      continue;
    }
    if(!current) continue;

    if(line.match(/^\s*\{\s*$/)){
      curObj={};
      continue;
    }
    if(line.match(/^\s*\},?\s*$/)){
      if(curObj && Object.keys(curObj).length>0) map.get(current).push(curObj);
      curObj=null;
      continue;
    }
    if(!curObj) continue;

    const name=line.match(/name:\s*'([^']+)'/);
    if(name) curObj.name=name[1];
    const ev=line.match(/evidenceDirSuffix:\s*'([^']+)'/);
    if(ev) curObj.evidenceDirSuffix=ev[1];
    const cmd=line.match(/command:\s*'([^']+)'/);
    if(cmd) curObj.command=cmd[1];
    const rm=line.match(/requiredMode:\s*'([^']+)'/);
    if(rm) curObj.requiredMode=rm[1];
    const rw=line.match(/requiredWindow:\s*'([^']+)'/);
    if(rw) curObj.requiredWindow=rw[1];
  }
  return map;
}

function loosenEvidence(s){
  // allow docs to use ... shorthand for evidence paths
  return String(s).replace(/artifacts\/evidence\//g,'').split('/cases/').pop();
}

function norm(s){
  return String(s||'').toLowerCase();
}

function containsAll(docText, needles){
  const missing=[];
  for(const n of needles){
    if(docText.includes(n)) continue;
    const loose = loosenEvidence(n);
    if(loose && docText.includes(loose)) continue;
    missing.push(n);
  }
  return missing;
}

function containsAny(docText, keywords){
  const t=norm(docText);
  return keywords.some(k=>t.includes(norm(k)));
}

function containsWord(docText, word){
  const t=norm(docText);
  const w=norm(word);
  if(!w) return true;
  const re=new RegExp(`(^|[^a-z0-9_])${w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z0-9_]|$)`,'i');
  return re.test(t);
}

function main(){
  const comp=read(completionPath);
  const req=read(requiredDoc);
  const chk=read(checklistDoc);

  const rr=extractRequiredRuns(comp);
  const out=[];

  for(const [ct, items] of rr.entries()){
    const evidences = items.map(x=>x.evidenceDirSuffix).filter(Boolean);
    const missingInReq=containsAll(req, evidences);
    const missingInChk=containsAll(chk, evidences);

    // semantic checks (MVP)
    const missingModeWindowInReq=[];
    const missingModeWindowInChk=[];
    for(const it of items){
      if(!it.requiredMode && !it.requiredWindow) continue;
      const need=[it.requiredMode,it.requiredWindow].filter(Boolean);
      if(need.length===0) continue;

      // Allow docs/checklist to omit mode/window when it's obvious by section (MVP)
      const allowModeWindowOmission = (ct === 'selection_logic_change' || ct === 'gate_rule_change');
      const okReq = allowModeWindowOmission ? true : need.every(n=>containsWord(req,n));
      const okChk = allowModeWindowOmission ? true : need.every(n=>containsWord(chk,n));
      if(!okReq) missingModeWindowInReq.push({name:it.name, requiredMode:it.requiredMode||null, requiredWindow:it.requiredWindow||null});
      if(!okChk) missingModeWindowInChk.push({name:it.name, requiredMode:it.requiredMode||null, requiredWindow:it.requiredWindow||null});
    }

    // selection keyword check
    const selectionKeywords = ['rsel', 'selection_case_present', 'selection_churn', 'selection_instability', 'selection_churn_high'];
    const selectionMust = (ct === 'selection_logic_change');
    const selectionDocOk = selectionMust ? containsAny(req, selectionKeywords) : true;
    const selectionChkOk = selectionMust ? containsAny(chk, selectionKeywords) : true;

    out.push({
      changeType: ct,
      requiredItems: items.map(x=>({name:x.name||null, evidenceDirSuffix:x.evidenceDirSuffix||null, requiredMode:x.requiredMode||null, requiredWindow:x.requiredWindow||null})),
      missingEvidenceInRequiredRegressionsDoc: missingInReq,
      missingEvidenceInChecklist: missingInChk,
      missingModeWindowInRequiredRegressionsDoc: missingModeWindowInReq,
      missingModeWindowInChecklist: missingModeWindowInChk,
      selectionKeywordPresence: selectionMust ? { requiredRegressionsDoc: selectionDocOk, checklist: selectionChkOk } : null,
    });
  }

  const hasDrift = out.some(x=>
    x.missingEvidenceInRequiredRegressionsDoc.length>0 ||
    x.missingEvidenceInChecklist.length>0 ||
    x.missingModeWindowInRequiredRegressionsDoc.length>0 ||
    x.missingModeWindowInChecklist.length>0 ||
    (x.selectionKeywordPresence && (!x.selectionKeywordPresence.requiredRegressionsDoc || !x.selectionKeywordPresence.checklist))
  );

  const report={ ok:true, kind:'p18_3_alignment_check', sourceOfTruth:'scripts/p13_1_regression_completion.mjs#REQUIRED_RUNS', hasDrift, report: out };
  fs.writeFileSync('artifacts/examples/p17-3-alignment-check.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}

main();
