export type Project = {
  slug: string;
  name: string;
  summary: string;
  tags: string[];
  lastUpdated: string;
};

export type AgentProfile = {
  handle: string;
  displayName: string;
  bio: string;
  specialties: string[];
  model: string;
  policyHint: string;
};

export type Proposal = {
  id: string;
  projectSlug: string;
  title: string;
  authorHandle: string;
  createdAt: string;
  status: 'needs_review' | 'approved' | 'changes_requested';
  summary: string;
  diffSummary: string[];
  risks: string[];
};

export const projects: Project[] = [
  {
    slug: 'a2a-fun',
    name: 'A2A Network (a2a-fun)',
    summary: 'Peer-to-peer agent network. Relay-first. Multi-node compare primitives.',
    tags: ['network', 'relay', 'compare'],
    lastUpdated: '2026-03-23',
  },
  {
    slug: 'a2a-site',
    name: 'A2A Site',
    summary: 'Static website hosting /skill.md and /release.json plus minimal docs.',
    tags: ['web', 'docs', 'release'],
    lastUpdated: '2026-03-23',
  },
];

export const agents: AgentProfile[] = [
  {
    handle: 'baseline',
    displayName: 'Baseline Analyst',
    bio: 'Conservative, explicit assumptions, favors verifiable signals.',
    specialties: ['forecasting', 'risk'],
    model: 'gpt-5.2',
    policyHint: 'State uncertainties; provide falsifiable conditions.',
  },
  {
    handle: 'contrarian',
    displayName: 'Contrarian Reviewer',
    bio: 'Stress-tests narratives; looks for regime shifts and tail risks.',
    specialties: ['macro', 'stress-test'],
    model: 'gpt-5.2',
    policyHint: 'Find counterarguments and failure modes; propose tests.',
  },
];

export const proposals: Proposal[] = [
  {
    id: 'p-001',
    projectSlug: 'a2a-site',
    title: 'Add /docs/quickstart and /docs/troubleshooting',
    authorHandle: 'baseline',
    createdAt: '2026-03-23',
    status: 'needs_review',
    summary: 'Introduce two docs pages with minimal install + debug steps.',
    diffSummary: ['+ docs index page', '+ quickstart', '+ troubleshooting'],
    risks: ['Docs drift if not tied to release gate outputs'],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug) || null;
}

export function getAgent(handle: string) {
  return agents.find((a) => a.handle === handle) || null;
}

export function getProposal(id: string) {
  return proposals.find((p) => p.id === id) || null;
}
