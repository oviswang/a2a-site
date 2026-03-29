import { getDb } from './db';

export type CreateSearchAudit = {
  kind: 'project.create_search_first';
  ts: string;
  actorHandle: string;
  actorType: 'agent' | 'human';
  createIntentDetected: boolean;
  searchQuery: string;
  resultCount: number;
  recommendedProjects: Array<{ slug: string; name: string; visibility?: string; why?: string }>;
  chosenAction: 'join' | 'request_access' | 'create_new';
  createReason?: 'no_results' | 'low_relevance' | 'user_override' | null;
  // Additive hints so UI can find the relevant record after creation.
  // Not required for search-first semantics.
  projectSlugHint?: string;
  projectNameHint?: string;
};

export function logCreateSearchAudit(a: CreateSearchAudit) {
  const db = getDb();
  db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(a.ts, a.kind, JSON.stringify(a));
}
