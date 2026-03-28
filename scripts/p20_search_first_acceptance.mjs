import fs from 'node:fs';
import { getDb } from '../web/src/server/db.ts';
import { createProject, searchAll, joinProject } from '../web/src/server/repo.ts';
import { buildSearchQuery, searchFirstProjects } from '../web/src/server/searchFirst.ts';
import { logCreateSearchAudit } from '../web/src/server/audit.ts';

const db=getDb();

function ok(x,msg){ if(!x){ console.error('FAIL',msg); process.exitCode=1; } else console.log('OK',msg); }

// Ensure there is an open + restricted project to hit
const openSlug='sf-open';
const restSlug='sf-restricted';
try { createProject({name:'SearchFirst Open Project', slug:openSlug, summary:'open workspace for search-first test', visibility:'open', actorHandle:'tester', actorType:'human', template:'general'}); } catch {}
try { createProject({name:'SearchFirst Restricted Project', slug:restSlug, summary:'restricted workspace for search-first test', visibility:'restricted', actorHandle:'tester', actorType:'human', template:'general'}); } catch {}

// 1) Open hit -> should recommend join, not allow create
{
  const q=buildSearchQuery({name:'SearchFirst Open Project', summary:'open'});
  const r=searchFirstProjects({query:q});
  ok(r.resultCount>0,'open: search hits');
  ok(r.createAllowed===false,'open: create not allowed when hits exist');
  ok(r.recommended.some(p=>p.slug===openSlug),'open: recommended contains open project');
}

// 2) Restricted hit -> recommend request access (via join API semantics); still not allow create
{
  const q=buildSearchQuery({name:'Restricted', summary:'search-first restricted'});
  const r=searchFirstProjects({query:q});
  ok(r.resultCount>0,'restricted: search hits');
  ok(r.createAllowed===false,'restricted: create not allowed when hits exist');
  // joinProject should request when restricted
  const jr = joinProject({projectSlug:restSlug, actorHandle:'agent-test', actorType:'agent'});
  ok(jr.mode==='requested' || jr.mode==='joined' || jr.mode==='already_member','restricted: join returns requested/joined');
}

// 3) No match -> create allowed
{
  const r=searchFirstProjects({query:'zzzz-no-such-project-uniq-12345'});
  ok(r.resultCount===0,'no-match: 0 results');
  ok(r.createAllowed===true,'no-match: create allowed');
}

// 4) Repeat forever -> second attempt still search-first
{
  const r1=searchFirstProjects({query:'SearchFirst Open Project'});
  const r2=searchFirstProjects({query:'SearchFirst Open Project'});
  ok(r1.resultCount===r2.resultCount,'repeat: search-first deterministic');
}

// 5) Create intent can be extracted into query and returns recommended
{
  const q=buildSearchQuery({name:'SearchFirst', summary:'Open Project workspace'});
  ok(q.length>0,'query builder produced query');
  const token=q.split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length)[0] || q;
  const r=searchAll(token);
  ok((r.projects||[]).length>0,'query returns project results');
}

// Audit log minimal
{
  logCreateSearchAudit({
    kind:'project.create_search_first',
    ts:new Date().toISOString(),
    actorHandle:'tester',
    actorType:'human',
    createIntentDetected:true,
    searchQuery:'SearchFirst',
    resultCount:2,
    recommendedProjects:[{slug:openSlug,name:'SearchFirst Open Project'}],
    chosenAction:'join',
    createReason:'low_relevance'
  });
  const c=db.prepare("SELECT COUNT(*) as n FROM audit_events WHERE kind='project.create_search_first'").get();
  ok(Number(c.n)>=1,'audit: events written');
}

if(process.exitCode) process.exit(1);
console.log('ALL_OK');
