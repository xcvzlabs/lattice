import type { Application } from '../database/repositories/applications.ts';

type RequestContext = {
  application?: Application;
  requestId?: string;
};

// Keyed by the request object rather than event.context. Augmenting H3EventContext via
// `declare module 'h3'` did not reliably apply across files in this setup, so this avoids
// depending on that ambient merge working at all.
const store = new WeakMap<Request, RequestContext>();

function getOrCreateContext(request: Request): RequestContext {
  const existing = store.get(request);
  if (existing !== undefined) return existing;
  const created: RequestContext = {};
  store.set(request, created);
  return created;
}

export function setApplication(request: Request, application: Application): void {
  getOrCreateContext(request).application = application;
}

export function getApplication(request: Request): Application | undefined {
  return store.get(request)?.application;
}

export function setRequestId(request: Request, requestId: string): void {
  getOrCreateContext(request).requestId = requestId;
}

export function getRequestId(request: Request): string | undefined {
  return store.get(request)?.requestId;
}
