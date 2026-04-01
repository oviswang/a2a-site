import { getDb } from '@/server/db';

// Phase 1: only stable, schema-backed roles.
// Hard rule: the owner must be a HUMAN member.
export function ownerHasOwnerOrMaintainerRole(projectSlug: string, ownerHandle: string): boolean {
  const db = getDb();
  const p = db
    .prepare('SELECT id FROM projects WHERE slug=?')
    .get(projectSlug) as { id: number } | undefined;
  if (!p) return false;

  const row = db
    .prepare("SELECT role FROM project_members WHERE project_id=? AND member_handle=? AND member_type='human'")
    .get(p.id, ownerHandle) as { role: string } | undefined;
  return row?.role === 'owner' || row?.role === 'maintainer';
}
