'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { agents } from '@/lib/mock';

export type WorkspaceFile = {
  path: string;
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

type WorkspaceState = {
  projects: WorkspaceProject[];
  proposalsByProject: Record<string, WorkspaceProposal[]>;
  proposalsById: Record<string, WorkspaceProposal>;
  loading: boolean;
  error: string | null;
};

const Ctx = createContext<{
  state: WorkspaceState;
  actions: {
    refreshProjects: () => Promise<void>;
    loadProject: (slug: string) => Promise<void>;
    createProject: (args: { name: string; slug?: string; summary: string; visibility: 'open' | 'restricted' }) => Promise<WorkspaceProject | null>;
    createProposal: (args: {
      projectSlug: string;
      title: string;
      summary: string;
      authorHandle: string;
      filePath: string;
      newContent: string;
    }) => Promise<WorkspaceProposal | null>;
    proposalAction: (id: string, action: 'approve' | 'request_changes' | 'reject' | 'merge') => Promise<WorkspaceProposal | null>;
    loadProposal: (id: string) => Promise<WorkspaceProposal | null>;
  };
} | null>(null);

async function json<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('non_json');
  return (await res.json()) as T;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({
    projects: [],
    proposalsByProject: {},
    proposalsById: {},
    loading: true,
    error: null,
  });

  async function refreshProjects() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      const data = await json<{ ok: boolean; projects: WorkspaceProject[] }>(res);
      setState((s) => ({ ...s, projects: data.projects || [], loading: false }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'load_failed';
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }

  async function loadProject(slug: string) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const data = await json<{ ok: boolean; project: WorkspaceProject; proposals: WorkspaceProposal[] }>(res);

      setState((s) => {
        const projects = s.projects.some((p) => p.slug === slug)
          ? s.projects.map((p) => (p.slug === slug ? data.project : p))
          : [data.project, ...s.projects];

        const proposalsById = { ...s.proposalsById };
        for (const pr of data.proposals || []) proposalsById[pr.id] = pr;

        return {
          ...s,
          projects,
          proposalsByProject: { ...s.proposalsByProject, [slug]: data.proposals || [] },
          proposalsById,
        };
      });
    } catch {
      // ignore; page can show fallback
    }
  }

  async function createProject(args: { name: string; slug?: string; summary: string; visibility: 'open' | 'restricted' }) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args),
      });
      const data = await json<{ ok: boolean; project: WorkspaceProject }>(res);
      setState((s) => ({ ...s, projects: [data.project, ...s.projects] }));
      return data.project;
    } catch {
      return null;
    }
  }

  async function createProposal(args: {
    projectSlug: string;
    title: string;
    summary: string;
    authorHandle: string;
    filePath: string;
    newContent: string;
  }) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(args.projectSlug)}/proposals`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args),
      });
      const data = await json<{ ok: boolean; proposal: WorkspaceProposal }>(res);

      setState((s) => {
        const list = s.proposalsByProject[args.projectSlug] || [];
        return {
          ...s,
          proposalsByProject: { ...s.proposalsByProject, [args.projectSlug]: [data.proposal, ...list] },
          proposalsById: { ...s.proposalsById, [data.proposal.id]: data.proposal },
        };
      });

      await loadProject(args.projectSlug);
      return data.proposal;
    } catch {
      return null;
    }
  }

  async function loadProposal(id: string) {
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await json<{ ok: boolean; proposal: WorkspaceProposal }>(res);
      setState((s) => ({ ...s, proposalsById: { ...s.proposalsById, [id]: data.proposal } }));
      return data.proposal;
    } catch {
      return null;
    }
  }

  async function proposalAction(id: string, action: 'approve' | 'request_changes' | 'reject' | 'merge') {
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(id)}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await json<{ ok: boolean; proposal: WorkspaceProposal }>(res);

      setState((s) => {
        const pr = data.proposal;
        const proposalsById = { ...s.proposalsById, [pr.id]: pr };
        const list = s.proposalsByProject[pr.projectSlug] || [];
        const proposalsByProject = {
          ...s.proposalsByProject,
          [pr.projectSlug]: list.map((x) => (x.id === pr.id ? pr : x)),
        };
        return { ...s, proposalsById, proposalsByProject };
      });

      // Merge affects project files/activity.
      await loadProject(data.proposal.projectSlug);
      return data.proposal;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshProjects();
  }, []);

  const api = {
    state,
    actions: { refreshProjects, loadProject, createProject, createProposal, proposalAction, loadProposal },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error('WorkspaceProvider missing');
  return v;
}

export const mockAgentHandles = agents.map((a) => a.handle);
