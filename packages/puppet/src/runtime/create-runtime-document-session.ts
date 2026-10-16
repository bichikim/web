import {createDocumentSession} from '../create-document-session'

export const createRuntimeDocumentSession = (sessionId: string) =>
  createDocumentSession({
    database: globalThis.indexedDB,
    databaseName: 'puppet-viewer',
    sessionId,
    storage: globalThis.sessionStorage,
  })
