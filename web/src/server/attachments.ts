import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db';
import type { MemberType } from './repo';

export type DeliverableAttachment = {
  id: string;
  deliverableId: string;
  taskId: string;
  projectSlug: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedByHandle: string;
  uploadedByType: MemberType;
  createdAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `a-${Math.random().toString(16).slice(2, 8)}${Date.now().toString(16).slice(-4)}`;
}

export function sanitizeFilename(name: string) {
  const base = String(name || 'file').split(/[/\\]/).pop() || 'file';
  // Keep only a safe subset; collapse whitespace.
  const safe = base.replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9. _-]/g, '_').trim();
  return safe.slice(0, 120) || 'file';
}

export function uploadsRoot() {
  return path.join(process.cwd(), '.data', 'uploads');
}

export function attachmentStoragePath(storageKey: string) {
  // storageKey is relative and must not escape uploadsRoot.
  const root = uploadsRoot();
  const p = path.join(root, storageKey);
  const rel = path.relative(root, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('invalid_storage_key');
  return p;
}

export function listAttachmentsForTask(taskId: string): DeliverableAttachment[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, deliverable_id, task_id, project_slug, name, mime_type, size_bytes, storage_key,
              uploaded_by_handle, uploaded_by_type, created_at
       FROM deliverable_attachments
       WHERE task_id=?
       ORDER BY created_at ASC`
    )
    .all(taskId) as Array<any>;

  return rows.map((r) => ({
    id: r.id,
    deliverableId: r.deliverable_id,
    taskId: r.task_id,
    projectSlug: r.project_slug,
    name: r.name,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes || 0),
    storageKey: r.storage_key,
    uploadedByHandle: r.uploaded_by_handle,
    uploadedByType: r.uploaded_by_type === 'agent' ? 'agent' : 'human',
    createdAt: r.created_at,
  }));
}

export function listAttachmentsForDeliverable(deliverableId: string): DeliverableAttachment[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, deliverable_id, task_id, project_slug, name, mime_type, size_bytes, storage_key,
              uploaded_by_handle, uploaded_by_type, created_at
       FROM deliverable_attachments
       WHERE deliverable_id=?
       ORDER BY created_at ASC`
    )
    .all(deliverableId) as Array<any>;

  return rows.map((r) => ({
    id: r.id,
    deliverableId: r.deliverable_id,
    taskId: r.task_id,
    projectSlug: r.project_slug,
    name: r.name,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes || 0),
    storageKey: r.storage_key,
    uploadedByHandle: r.uploaded_by_handle,
    uploadedByType: r.uploaded_by_type === 'agent' ? 'agent' : 'human',
    createdAt: r.created_at,
  }));
}

export function getAttachmentById(id: string): DeliverableAttachment | null {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT id, deliverable_id, task_id, project_slug, name, mime_type, size_bytes, storage_key,
              uploaded_by_handle, uploaded_by_type, created_at
       FROM deliverable_attachments
       WHERE id=?`
    )
    .get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    deliverableId: r.deliverable_id,
    taskId: r.task_id,
    projectSlug: r.project_slug,
    name: r.name,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes || 0),
    storageKey: r.storage_key,
    uploadedByHandle: r.uploaded_by_handle,
    uploadedByType: r.uploaded_by_type === 'agent' ? 'agent' : 'human',
    createdAt: r.created_at,
  };
}

export function createAttachment(args: {
  deliverableId: string;
  taskId: string;
  projectSlug: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Uint8Array;
  uploadedByHandle: string;
  uploadedByType: MemberType;
}): DeliverableAttachment {
  const id = newId();
  const createdAt = nowIso();

  const safeName = sanitizeFilename(args.name);
  const storageKey = path.join(args.deliverableId, `${id}-${safeName}`);

  const root = uploadsRoot();
  fs.mkdirSync(path.join(root, args.deliverableId), { recursive: true });

  const outPath = attachmentStoragePath(storageKey);
  fs.writeFileSync(outPath, Buffer.from(args.bytes));

  const db = getDb();
  db.prepare(
    `INSERT INTO deliverable_attachments
      (id, deliverable_id, task_id, project_slug, name, mime_type, size_bytes, storage_key, uploaded_by_handle, uploaded_by_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    args.deliverableId,
    args.taskId,
    args.projectSlug,
    safeName,
    args.mimeType || 'application/octet-stream',
    Number(args.sizeBytes || 0),
    storageKey,
    args.uploadedByHandle,
    args.uploadedByType,
    createdAt
  );

  return getAttachmentById(id)!;
}
