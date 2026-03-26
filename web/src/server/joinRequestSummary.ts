import type { MemberType } from './repo';

export type PreSummary = {
  fit: 'likely' | 'unclear' | 'weak';
  recommendation: 'approve' | 'review' | 'reject';
  reason: string;
};

function looksTestSystem(handle: string) {
  const h = String(handle || '').toLowerCase();
  return (
    h.includes('test') ||
    h.includes('demo') ||
    h.includes('verify') ||
    h.includes('authgap') ||
    h.includes('acceptance') ||
    h.includes('local-')
  );
}

export function computeJoinRequestPreSummary(args: {
  requesterHandle: string;
  requesterType: MemberType;
  project: { id: number; slug: string; name: string };
  requester: { createdAt?: string | null };
  prior: { alreadyMember: boolean; priorInviteStatus?: 'pending' | 'accepted' | null };
  recent: { taskTitles: string[]; proposalTexts: string[] };
}): PreSummary {
  const { requesterHandle, project, requester, prior, recent } = args;

  // Conservative defaults.
  let fit: PreSummary['fit'] = 'unclear';
  let recommendation: PreSummary['recommendation'] = 'review';
  let reason = 'Not enough signal yet — review manually.';

  if (looksTestSystem(requesterHandle)) {
    return {
      fit: 'weak',
      recommendation: 'reject',
      reason: 'This looks like a test/system identity — reject is recommended.',
    };
  }

  if (prior.alreadyMember) {
    return { fit: 'likely', recommendation: 'approve', reason: 'They are already a member of this project.' };
  }

  if (prior.priorInviteStatus) {
    return {
      fit: 'likely',
      recommendation: 'approve',
      reason: 'The requester was previously invited to this project.',
    };
  }

  // Very new identity -> bias toward review.
  if (requester.createdAt) {
    const ageMs = Date.now() - new Date(requester.createdAt).getTime();
    if (ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000) {
      return { fit: 'unclear', recommendation: 'review', reason: 'This identity is very new, so review is safer.' };
    }
  }

  // Keyword overlap: project slug/name vs recent work.
  const pSlug = String(project.slug || '').toLowerCase();
  const pName = String(project.name || '').toLowerCase();
  const keywords = Array.from(new Set([pSlug, ...pName.split(/\s+/g)].filter(Boolean))).filter((k) => k.length >= 4).slice(0, 8);

  const corpus = (recent.taskTitles.join(' ') + ' ' + recent.proposalTexts.join(' ')).toLowerCase();
  const overlap = keywords.filter((k) => corpus.includes(k)).length;

  if (overlap >= 2) {
    fit = 'likely';
    recommendation = 'approve';
    reason = 'Recent work topics overlap with this project.';
  } else if (overlap === 1) {
    fit = 'unclear';
    recommendation = 'review';
    reason = 'Some overlap with this project — review manually.';
  }

  return { fit, recommendation, reason };
}
