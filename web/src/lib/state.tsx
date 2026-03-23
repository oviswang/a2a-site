'use client';

import { createContext, useContext, useMemo, useReducer } from 'react';
import { agents, projects as seedProjects, proposals as seedProposals } from '@/lib/mock';

export type WorkspaceFile = {
  path: string; // e.g. "README.md" or "docs/quickstart.md"
  content: string;
  updatedAt: string;
};

export type WorkspaceProject = {
  slug: string;
  name: string;
  summary: string;
  visibility: 'open' | 'restricted';
  tags: string[];
  files: WorkspaceFile[];
  activity: Array<{ ts: string; text: string }>;
};

export type WorkspaceProposal = {
  id: string;
  projectSlug: string;
  title: string;
  authorHandle: string;
  createdAt: string;
  status: 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged';
  summary: string;
  filePath: string;
  newContent: string;
};

export type WorkspaceState = {
  projects: WorkspaceProject[];
  proposals: WorkspaceProposal[];
};

function nowIso() {
  return new Date().toISOString();
}

function slugify(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function initialState(): WorkspaceState {
  // Seed with mock projects, but add a markdown-oriented file tree.
  const seeded: WorkspaceProject[] = seedProjects.map((p) => {
    const baseFiles: WorkspaceFile[] = [
      {
        path: 'README.md',
        content: `# ${p.name}\n\n${p.summary}\n`,
        updatedAt: '2026-03-23',
      },
      {
        path: 'PROJECT.md',
        content:
          '## Deliverable\nThis project ships markdown.\n\n- Keep changes reviewable\n- Prefer explicit assumptions\n',
        updatedAt: '2026-03-23',
      },
      {
        path: 'docs/quickstart.md',
        content: '## Quickstart (draft)\n\n1) Open /skill.md\n2) Install\n3) Verify\n',
        updatedAt: '2026-03-23',
      },
    ];

    return {
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      visibility: p.slug === 'a2a-fun' ? 'restricted' : 'open',
      tags: p.tags,
      files: baseFiles,
      activity: [{ ts: nowIso(), text: 'Workspace initialized (mock state)' }],
    };
  });

  const seededProposals: WorkspaceProposal[] = seedProposals.map((pr) => ({
    id: pr.id,
    projectSlug: pr.projectSlug,
    title: pr.title,
    authorHandle: pr.authorHandle,
    createdAt: pr.createdAt,
    status: pr.status as WorkspaceProposal['status'],
    summary: pr.summary,
    filePath: 'docs/quickstart.md',
    newContent: '## Quickstart (draft)\n\n- Updated from proposal\n',
  }));

  return { projects: seeded, proposals: seededProposals };
}

type Action =
  | { type: 'project.create'; name: string; slug?: string; summary: string; visibility: 'open' | 'restricted' }
  | { type: 'file.select'; projectSlug: string; filePath: string }
  | { type: 'proposal.create'; projectSlug: string; title: string; summary: string; authorHandle: string; filePath: string; newContent: string }
  | { type: 'proposal.action'; id: string; action: 'approve' | 'request_changes' | 'reject' | 'merge' };

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'project.create': {
      const slug = action.slug && action.slug.trim() ? slugify(action.slug) : slugify(action.name);
      if (!slug) return state;
      if (state.projects.some((p) => p.slug === slug)) return state;

      const p: WorkspaceProject = {
        slug,
        name: action.name.trim(),
        summary: action.summary.trim() || 'No summary',
        visibility: action.visibility,
        tags: ['new'],
        files: [
          { path: 'README.md', content: `# ${action.name.trim()}\n\n${action.summary.trim()}\n`, updatedAt: nowIso() },
          { path: 'DECISIONS.md', content: '# Decisions\n\n- (empty)\n', updatedAt: nowIso() },
          { path: 'TODO.md', content: '# TODO\n\n- (empty)\n', updatedAt: nowIso() },
        ],
        activity: [{ ts: nowIso(), text: `Project created (${action.visibility})` }],
      };

      return { ...state, projects: [p, ...state.projects] };
    }

    case 'proposal.create': {
      const id = `p-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
      const pr: WorkspaceProposal = {
        id,
        projectSlug: action.projectSlug,
        title: action.title.trim() || 'Untitled proposal',
        authorHandle: action.authorHandle,
        createdAt: nowIso().slice(0, 10),
        status: 'needs_review',
        summary: action.summary.trim() || 'No summary',
        filePath: action.filePath,
        newContent: action.newContent,
      };
      return { ...state, proposals: [pr, ...state.proposals] };
    }

    case 'proposal.action': {
      const next: WorkspaceProposal[] = state.proposals.map((p) => {
        if (p.id !== action.id) return p;
        if (action.action === 'approve') return { ...p, status: 'approved' };
        if (action.action === 'request_changes') return { ...p, status: 'changes_requested' };
        if (action.action === 'reject') return { ...p, status: 'rejected' };
        if (action.action === 'merge') return { ...p, status: 'merged' };
        return p;
      });

      // If merge: apply change to file content in project.
      const merged = next.find((p) => p.id === action.id);
      if (action.action !== 'merge' || !merged) return { ...state, proposals: next };

      const projects2 = state.projects.map((proj) => {
        if (proj.slug !== merged.projectSlug) return proj;
        const files2 = proj.files.map((f) => (f.path === merged.filePath ? { ...f, content: merged.newContent, updatedAt: nowIso() } : f));
        const exists = proj.files.some((f) => f.path === merged.filePath);
        const files3 = exists ? files2 : [...files2, { path: merged.filePath, content: merged.newContent, updatedAt: nowIso() }];
        return {
          ...proj,
          files: files3,
          activity: [{ ts: nowIso(), text: `Merged ${merged.id} into ${merged.filePath}` }, ...proj.activity],
        };
      });

      return { ...state, proposals: next, projects: projects2 };
    }

    default:
      return state;
  }
}

const Ctx = createContext<{
  state: WorkspaceState;
  actions: {
    createProject: (args: { name: string; slug?: string; summary: string; visibility: 'open' | 'restricted' }) => void;
    createProposal: (args: { projectSlug: string; title: string; summary: string; authorHandle: string; filePath: string; newContent: string }) => string | null;
    proposalAction: (id: string, action: 'approve' | 'request_changes' | 'reject' | 'merge') => void;
  };
} | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const api = useMemo(() => {
    return {
      state,
      actions: {
        createProject: (args: { name: string; slug?: string; summary: string; visibility: 'open' | 'restricted' }) => {
          dispatch({ type: 'project.create', name: args.name, slug: args.slug, summary: args.summary, visibility: args.visibility });
        },
        createProposal: (args: { projectSlug: string; title: string; summary: string; authorHandle: string; filePath: string; newContent: string }) => {
          dispatch({ type: 'proposal.create', ...args });
          return null;
        },
        proposalAction: (id: string, action: 'approve' | 'request_changes' | 'reject' | 'merge') => {
          dispatch({ type: 'proposal.action', id, action });
        },
      },
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error('WorkspaceProvider missing');
  return v;
}

export const mockAgentHandles = agents.map((a) => a.handle);
