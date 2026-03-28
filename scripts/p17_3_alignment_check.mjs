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

    // optional: expected check fields (array of strings)
    const ef=line.match(/expectedFields:\s*\[([^\]]*)\]/);
    if(ef){
      const inner=ef[1];
      const fields=[...inner.matchAll(/'([^']+)'/g)].map(x=>x[1]);
      if(fields.length>0) curObj.expectedFields=fields;
    }
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

    // command/field checks (P19-3 MVP)
    const commandKeywordNeedles = ['p7_2_gate_mvp.sh','p7_3_signal_to_action.mjs','--change-type'];
    const requiredRunNames = items.map(x=>x.name).filter(Boolean);
    const requiredCommands = items.map(x=>x.command).filter(Boolean);

    const missingRunNamesInChecklist = requiredRunNames.filter(n=>!containsAny(chk,[n]));

    // command keywords are expected in checklist more than in required-regressions doc
    const commandNeedleOkReq = true;
    const commandNeedleOkChk = commandKeywordNeedles.every(k=>containsWord(chk,k));

    const missingCommandsInChecklist = requiredCommands.filter(c=>!containsAny(chk,[c]));

    const commonFields = [
      'releaseReadiness',
      'releaseBlockingReasons',
      'requiredRegressionsComplete',
      'evidenceSufficiency',
      'matrixDispositionOverride',
      'dispositionReason',
    ];
    const selectionFields = ['rsel','selection_case_present','selection_','keymetrics.selection'];

    const strictCT = new Set(['selection_logic_change','runner_behavior_change','same_role_coordination_config','gate_rule_change','refresh_cost_config']);
    const needFields = strictCT.has(ct) ? commonFields : [];
    const missingFieldsInChecklist = needFields.filter(f=>!containsWord(chk,f));

    // P20-3: required vs supplemental + weakening detection (MVP)
    const weakeningWords = [
      'optional','suggest','may','can','if needed','recommended',
      // NOTE: exclude generic Chinese "建议" because checklist may contain unrelated "建议跑" sections.
      '可选','可考虑','如有需要','推荐'
    ];
    const weakeningWindowChars = 220;
    function hasWeakeningNear(text, needle){
      const t=String(text||'');
      const n=String(needle||'');
      if(!n) return false;
      const i = t.toLowerCase().indexOf(n.toLowerCase());
      if(i<0) return false;
      const s=Math.max(0,i-weakeningWindowChars);
      const e=Math.min(t.length,i+n.length+weakeningWindowChars);
      let win=t.slice(s,e);
      // reduce false positives: drop earlier "建议跑:" blocks that may appear in the window
      const cut = win.toLowerCase().lastIndexOf('\n建议跑');
      if(cut >= 0) win = win.slice(cut + 1);

      // also treat "建议跑" itself as not weakening of required items
      const low=win.toLowerCase().replace(/\n\s*建议跑\s*:/gi,'');
      return weakeningWords.some(w=>low.includes(String(w).toLowerCase()));
    }

    // required items = REQUIRED_RUNS items (fact source)
    // Weakening detection: only apply to explicit "required" signals (name/command), not generic tokens like mode/window.
    const requiredItems = items;
    const requiredWeakeningInChecklist = [];
    for(const it of requiredItems){
      const needles=[];
      if(it.name) needles.push(it.name);
      if(it.command) needles.push(it.command);
      for(const nd of needles){
        if(hasWeakeningNear(chk, nd)){
          requiredWeakeningInChecklist.push({item: it.name||null, needle: nd});
          break;
        }
      }
    }

    const missingSelectionFieldsInChecklist = (ct==='selection_logic_change')
      ? selectionFields.filter(f=>!containsAny(chk,[f]))
      : [];

    out.push({
      changeType: ct,
      requiredItems: items.map(x=>({
        name:x.name||null,
        command:x.command||null,
        evidenceDirSuffix:x.evidenceDirSuffix||null,
        requiredMode:x.requiredMode||null,
        requiredWindow:x.requiredWindow||null,
        expectedFields:x.expectedFields||null,
      })),
      missingEvidenceInRequiredRegressionsDoc: missingInReq,
      missingEvidenceInChecklist: missingInChk,
      missingModeWindowInRequiredRegressionsDoc: missingModeWindowInReq,
      missingModeWindowInChecklist: missingModeWindowInChk,
      selectionKeywordPresence: selectionMust ? { requiredRegressionsDoc: selectionDocOk, checklist: selectionChkOk } : null,

      // P19-3
      missingRunNamesInChecklist,
      commandKeywordPresence: strictCT.has(ct) ? { requiredRegressionsDoc: commandNeedleOkReq, checklist: commandNeedleOkChk } : null,
      missingCommandsInChecklist,
      missingCommonFieldsInChecklist: missingFieldsInChecklist,
      missingSelectionFieldsInChecklist,

      // P20-3
      requiredWeakeningInChecklist,
    });
  }

  const hasDrift = out.some(x=>
    x.missingEvidenceInRequiredRegressionsDoc.length>0 ||
    x.missingEvidenceInChecklist.length>0 ||
    x.missingModeWindowInRequiredRegressionsDoc.length>0 ||
    x.missingModeWindowInChecklist.length>0 ||
    (x.selectionKeywordPresence && (!x.selectionKeywordPresence.requiredRegressionsDoc || !x.selectionKeywordPresence.checklist)) ||
    (x.missingRunNamesInChecklist && x.missingRunNamesInChecklist.length>0) ||
    (x.commandKeywordPresence && (!x.commandKeywordPresence.requiredRegressionsDoc || !x.commandKeywordPresence.checklist)) ||
    (x.missingCommandsInChecklist && x.missingCommandsInChecklist.length>0) ||
    (x.missingCommonFieldsInChecklist && x.missingCommonFieldsInChecklist.length>0) ||
    (x.missingSelectionFieldsInChecklist && x.missingSelectionFieldsInChecklist.length>0) ||
    (x.requiredWeakeningInChecklist && x.requiredWeakeningInChecklist.length>0)
  );

  const report={ ok:true, kind:'p20_3_consistency_hardening_check', sourceOfTruth:'scripts/p13_1_regression_completion.mjs#REQUIRED_RUNS', hasDrift, report: out };
  fs.writeFileSync('artifacts/examples/p17-3-alignment-check.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}

main();
