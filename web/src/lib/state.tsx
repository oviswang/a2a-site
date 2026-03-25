'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { agents } from '@/lib/mock';

export type WorkspaceFile = {
  path: string;
  content: string;
  updatedAt: string;
  lastActorHandle?: string | null;
  lastActorType?: 'human' | 'agent' | null;
  lastProposalId?: string | null;
};

export type WorkspaceMember = {
  handle: string;
  memberType: 'human' | 'agent';
  role: 'owner' | 'maintainer' | 'contributor';
  joinedAt: string;
};

export type WorkspaceJoinRequest = {
  id: string;
  handle: string;
  memberType: 'human' | 'agent';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type WorkspaceInvitation = {
  id: string;
  handle: string;
  memberType: 'human' | 'agent';
  role: 'owner' | 'maintainer' | 'contributor';
  status: 'pending' | 'accepted' | 'revoked';
  createdByHandle: string;
  createdByType: 'human' | 'agent';
  createdAt: string;
  acceptedAt: string | null;
};

export type WorkspaceProject = {
  slug: string;
  name: string;
  summary: string;
  visibility: 'open' | 'restricted'; // also used as join_mode for now
  tags: string[];
  createdAt?: string;
  files: WorkspaceFile[];
  activity: Array<{ ts: string; text: string }>;
  members: WorkspaceMember[];
  joinRequests: WorkspaceJoinRequest[];
  invitations?: WorkspaceInvitation[];
};

export type WorkspaceTask = {
  id: string;
  projectSlug: string;
  title: string;
  description: string;
  status: 'open' | 'claimed' | 'in_progress' | 'completed' | string;
  claimedByHandle: string | null;
  claimedByType: 'human' | 'agent' | null;
  createdAt: string;
  updatedAt: string;
  filePath: string | null;
};

export type WorkspaceProposal = {
  id: string;
  projectSlug: string;
  title: string;
  authorHandle: string;
  authorType: 'human' | 'agent';
  createdAt: string;
  updatedAt?: string | null;
  status: 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged';
  summary: string;
  filePath: string;
  newContent: string;
  taskId?: string | null;
  lastReview?: {
    action: string;
    actorHandle: string | null;
    actorType: 'human' | 'agent' | null;
    createdAt: string;
  } | null;
};

export type ActingUser = { handle: string; actorType: 'human' | 'agent' };

export type WorkspaceIdentity = {
  handle: string;
  identityType: 'human' | 'agent';
  displayName: string | null;
  ownerHandle: string | null;
  ownerUserId?: number | null;
  userId?: number | null;
  claimState: 'unclaimed' | 'claimed';
  origin?: 'local' | 'openclaw';
  claimToken?: string | null;
  bindingToken?: string | null;
  boundAt?: string | null;
  createdAt: string;
};

type WorkspaceState = {
  actor: ActingUser;
  identities: WorkspaceIdentity[];
  projects: WorkspaceProject[];
  tasksByProject: Record<string, WorkspaceTask[]>;
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
    setActor: (actor: ActingUser) => void;
    refreshIdentities: () => Promise<void>;
    createAgentIdentity: (args: { handle: string; displayName?: string }) => Promise<WorkspaceIdentity | null>;
    claimAgentIdentity: (handle: string) => Promise<WorkspaceIdentity | null>;
    createProject: (args: {
      name: string;
      slug?: string;
      summary: string;
      visibility: 'open' | 'restricted';
      template?: 'general' | 'research' | 'product';
    }) => Promise<WorkspaceProject | null>;
    createTask: (args: { projectSlug: string; title: string; description?: string; filePath?: string | null }) => Promise<WorkspaceTask | null>;
    taskAction: (taskId: string, action: 'claim' | 'unclaim' | 'start' | 'complete') => Promise<boolean>;
    joinProject: (projectSlug: string) => Promise<{ mode: string } | null>;
    reviewJoinRequest: (requestId: string, action: 'approve' | 'reject', role?: 'contributor' | 'maintainer') => Promise<boolean>;
    createProposal: (args: {
      projectSlug: string;
      title: string;
      summary: string;
      authorHandle: string;
      filePath: string;
      newContent: string;
      taskId?: string | null;
    }) => Promise<WorkspaceProposal | null>;
    proposalAction: (
      id: string,
      action: 'approve' | 'request_changes' | 'reject' | 'merge' | 'comment',
      note?: string
    ) => Promise<WorkspaceProposal | null>;
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
    actor: { handle: 'local-human', actorType: 'human' },
    identities: [],
    projects: [],
    tasksByProject: {},
    proposalsByProject: {},
    proposalsById: {},
    loading: true,
    error: null,
  });

  function setActor(actor: ActingUser) {
    try {
      localStorage.setItem('a2a_site_actor', JSON.stringify(actor));
    } catch {
      // ignore
    }
    setState((s) => ({ ...s, actor }));
  }

  async function refreshIdentities() {
    try {
      const res = await fetch('/api/identities', { cache: 'no-store' });
      const data = await json<{ ok: boolean; identities: WorkspaceIdentity[] }>(res);
      setState((s) => ({ ...s, identities: data.identities || [] }));
    } catch {
      // ignore
    }
  }

  async function createAgentIdentity(args: { handle: string; displayName?: string }) {
    try {
      const res = await fetch('/api/identities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(args),
      });
      const data = await json<{ ok: boolean; identity: WorkspaceIdentity }>(res);
      await refreshIdentities();
      return data.identity;
    } catch {
      return null;
    }
  }

  async function claimAgentIdentity(handle: string) {
    try {
      const res = await fetch(`/api/identities/${encodeURIComponent(handle)}/claim`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ownerHandle: state.actor.handle }),
      });
      const data = await json<{ ok: boolean; identity: WorkspaceIdentity }>(res);
      await refreshIdentities();
      return data.identity;
    } catch {
      return null;
    }
  }

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
      const data = await json<{ ok: boolean; project: WorkspaceProject; proposals: WorkspaceProposal[]; tasks: WorkspaceTask[] }>(res);

      setState((s) => {
        const projects = s.projects.some((p) => p.slug === slug)
          ? s.projects.map((p) => (p.slug === slug ? data.project : p))
          : [data.project, ...s.projects];

        const proposalsById = { ...s.proposalsById };
        for (const pr of data.proposals || []) proposalsById[pr.id] = pr;

        return {
          ...s,
          projects,
          tasksByProject: { ...s.tasksByProject, [slug]: data.tasks || [] },
          proposalsByProject: { ...s.proposalsByProject, [slug]: data.proposals || [] },
          proposalsById,
        };
      });
    } catch {
      // ignore; page can show fallback
    }
  }

  async function createProject(args: {
    name: string;
    slug?: string;
    summary: string;
    visibility: 'open' | 'restricted';
    template?: 'general' | 'research' | 'product';
  }) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...args, template: args.template || 'general', actorHandle: state.actor.handle, actorType: state.actor.actorType }),
      });
      const data = await json<{ ok: boolean; project: WorkspaceProject }>(res);
      setState((s) => ({ ...s, projects: [data.project, ...s.projects] }));
      return data.project;
    } catch {
      return null;
    }
  }

  async function createTask(args: { projectSlug: string; title: string; description?: string; filePath?: string | null }) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(args.projectSlug)}/tasks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...args,
          actorHandle: state.actor.handle,
          actorType: state.actor.actorType,
        }),
      });
      const data = await json<{ ok: boolean; task: WorkspaceTask }>(res);
      await loadProject(args.projectSlug);
      return data.task;
    } catch {
      return null;
    }
  }

  async function taskAction(taskId: string, action: 'claim' | 'unclaim' | 'start' | 'complete') {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, actorHandle: state.actor.handle, actorType: state.actor.actorType }),
      });
      const data = await json<{ ok: boolean }>(res);
      // We don't know which project without lookup; cheapest is refreshProjects + rely on per-page loadProject.
      return !!data.ok;
    } catch {
      return false;
    }
  }

  async function joinProject(projectSlug: string) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorHandle: state.actor.handle, actorType: state.actor.actorType }),
      });
      const data = await json<{ ok: boolean; result: { mode: string } }>(res);
      await loadProject(projectSlug);
      return data.result;
    } catch {
      return null;
    }
  }

  async function reviewJoinRequest(requestId: string, action: 'approve' | 'reject', role?: 'contributor' | 'maintainer') {
    try {
      const res = await fetch(`/api/join-requests/${encodeURIComponent(requestId)}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, role: role || 'contributor', actorHandle: state.actor.handle }),
      });
      const data = await json<{ ok: boolean }>(res);
      // Reload all projects to refresh joinRequests/members where relevant.
      await refreshProjects();
      return !!data.ok;
    } catch {
      return false;
    }
  }

  async function createProposal(args: {
    projectSlug: string;
    title: string;
    summary: string;
    authorHandle: string;
    filePath: string;
    newContent: string;
    taskId?: string | null;
  }) {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(args.projectSlug)}/proposals`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...args,
          authorType: agents.some((a) => a.handle === args.authorHandle) ? 'agent' : 'human',
        }),
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

  async function proposalAction(id: string, action: 'approve' | 'request_changes' | 'reject' | 'merge' | 'comment', note?: string) {
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(id)}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note: note || null, actorHandle: state.actor.handle, actorType: state.actor.actorType }),
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
    try {
      const raw = localStorage.getItem('a2a_site_actor');
      if (raw) {
        const parsed = JSON.parse(raw) as ActingUser;
        if (parsed?.handle && (parsed.actorType === 'human' || parsed.actorType === 'agent')) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState((s) => ({ ...s, actor: parsed }));
        }
      }
    } catch {
      // ignore
    }

    refreshProjects();
    refreshIdentities();
  }, []);

  const api = {
    state,
    actions: {
      setActor,
      refreshIdentities,
      createAgentIdentity,
      claimAgentIdentity,
      refreshProjects,
      loadProject,
      createProject,
      createTask,
      taskAction,
      joinProject,
      reviewJoinRequest,
      createProposal,
      proposalAction,
      loadProposal,
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error('WorkspaceProvider missing');
  return v;
}

export const mockAgentHandles = agents.map((a) => a.handle);
