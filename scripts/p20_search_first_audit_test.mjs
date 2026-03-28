import { getDb } from '../web/src/server/db.ts';
import { logCreateSearchAudit } from '../web/src/server/audit.ts';

const db=getDb();
logCreateSearchAudit({
  kind:'project.create_search_first',
  ts:new Date().toISOString(),
  actorHandle:'tester',
  actorType:'human',
  createIntentDetected:true,
  searchQuery:'test',
  resultCount:0,
  recommendedProjects:[],
  chosenAction:'create_new',
  createReason:'no_results',
});
const c=db.prepare("SELECT COUNT(*) as n FROM audit_events WHERE kind='project.create_search_first'").get();
console.log('audit_count', c.n);
