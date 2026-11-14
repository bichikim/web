import {MAX_TEXT_BYTES, SOURCE_CHUNK_LENGTH} from './reading-limits'
import {MAX_CODE_BYTES} from './editing-limits'
import {z} from 'zod'
import {treeStateSchema} from './tree-state'

export const locationSchema = z.object({
  column: z.number().int().positive(),
  line: z.number().int().positive(),
  path: z.string(),
})
export const tokenSchema = z.object({
  kind: z.enum(['plain', 'keyword', 'string', 'comment', 'number', 'identifier']),
  navigation: z.enum(['definition', 'path']).nullable(),
  offset: z.number().int().nonnegative(),
  text: z.string(),
})
export const documentSchema = z.object({
  lineCount: z.number().int().positive().optional(),
  lines: z.array(z.array(tokenSchema)),
  location: locationSchema,
  media: z
    .object({
      kind: z.enum(['image', 'video', 'audio', 'pdf', 'word', 'spreadsheet']),
      mimeType: z.string(),
      size: z.number().int().nonnegative(),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  revision: z.string(),
  source: z.string(),
  sourceLength: z.number().int().nonnegative().max(MAX_TEXT_BYTES).optional(),
})
export const sourceChunkSchema = z.object({
  data: z.string().max(SOURCE_CHUNK_LENGTH),
  next: z.number().int().nonnegative(),
})
export const mediaChunkSchema = z.object({data: z.string(), next: z.number().int().nonnegative()})
export const workspaceSessionSchema = z.object({
  session: z.string(),
  treeState: treeStateSchema.optional(),
  workspace: z.string(),
})
export const sessionSchema = workspaceSessionSchema.extend({document: documentSchema})
export const connectionSchema = z.union([sessionSchema, workspaceSessionSchema.strict()])
export const MAX_REFERENCE_PREVIEW = 400
export const MAX_NAVIGATION_PREVIEW_LINES = 5
export const navigationLocationSchema = locationSchema.extend({
  preview: z
    .string()
    .max((MAX_REFERENCE_PREVIEW + 1) * MAX_NAVIGATION_PREVIEW_LINES - 1)
    .optional(),
})
export type NavigationLocation = z.infer<typeof navigationLocationSchema>
export const navigationGroupSchema = z.object({
  count: z.number().int().positive(),
  path: z.string(),
})
export type NavigationGroup = z.infer<typeof navigationGroupSchema>
export const navigationSchema = z.object({
  groups: z.array(navigationGroupSchema).optional(),
  kind: z.enum(['definition', 'references']).optional(),
  locations: z.array(navigationLocationSchema),
})
export type NavigationKind = NonNullable<z.infer<typeof navigationSchema>['kind']>
export const navigationResultSchema = navigationSchema.required({kind: true})
export type NavigationResult = z.infer<typeof navigationResultSchema>
export const codeSourceSchema = z.object({path: z.string(), source: z.string().max(MAX_CODE_BYTES)})
export type CodeSource = z.infer<typeof codeSourceSchema>
export const navigationInputSchema = z.object({
  navigation: z.enum(['definition', 'path']),
  offset: z.number().int().nonnegative(),
  path: z.string(),
  revision: z.string(),
  sources: z.array(codeSourceSchema).optional(),
})
export type NavigationInput = z.infer<typeof navigationInputSchema>
export const filesSchema = z.object({paths: z.array(z.string())})
export const workspaceFileSchema = z.object({openable: z.boolean(), path: z.string()})
export const treeSchema = z.object({
  directories: z.array(z.string()).optional(),
  files: z.array(workspaceFileSchema),
  truncated: z.boolean(),
})
export const entrySchema = z.object({kind: z.enum(['file', 'directory']), path: z.string()})
export const entrySnapshotSchema = entrySchema.extend({revision: z.string()})
export type EntrySnapshot = z.infer<typeof entrySnapshotSchema>
export type WorkspaceEntry = z.infer<typeof entrySchema>
export type WorkspaceTree = z.infer<typeof treeSchema>
export type WorkspaceFile = z.infer<typeof workspaceFileSchema>
export const scanBatchSchema = z.object({
  complete: z.boolean(),
  directories: z.array(z.string()),
  directory: z.string(),
  failed: z.boolean().optional(),
  files: z.array(workspaceFileSchema),
  snapshot: z.boolean().optional(),
  version: z.string().optional(),
})
export type ScanBatch = z.infer<typeof scanBatchSchema>
export const streamEndpointSchema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value)
    if (url.username !== '' || url.password !== '') {
      return false
    }
    if (url.protocol === 'code-viewer:') {
      return (
        url.hostname === 'scan' &&
        url.port === '' &&
        /^\/[a-zA-Z0-9-]+$/u.test(url.pathname) &&
        url.search === '' &&
        url.hash === ''
      )
    }
    return (
      url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' ||
        (typeof globalThis.location !== 'undefined' && url.origin === globalThis.location.origin))
    )
  }),
})
export const errorSchema = z.object({
  code: z.enum([
    'clipboard-unavailable',
    'composer-permission-required',
    'composer-target-missing',
    'composer-attachment-failed',
    'not-found',
    'outside-workspace',
    'unsupported-file',
    'too-large',
    'text-too-large',
    'context-too-large',
    'media-too-large',
    'host-path-missing',
    'thread-unavailable',
    'invalid-workspace',
    'workspace-write-failed',
    'session-expired',
    'invalid-position',
    'read-failed',
    'stale-document',
    'write-conflict',
    'write-failed',
    'memo-write-failed',
    'invalid-name',
    'already-exists',
    'create-failed',
    'file-operation-failed',
    'entry-changed',
    'protected-entry',
    'operation-too-large',
    'invalid-destination',
    'rust-analyzer-unavailable',
    'rust-analysis-failed',
    'python-analyzer-unavailable',
    'python-analysis-failed',
    'ruby-analyzer-unavailable',
    'ruby-analysis-failed',
  ]),
})
export type CodeLocation = z.infer<typeof locationSchema>
export type CodeToken = z.infer<typeof tokenSchema>
export type CodeDocument = z.infer<typeof documentSchema>
export type ViewerSession = z.infer<typeof sessionSchema>
export type WorkspaceSession = z.infer<typeof workspaceSessionSchema>
export type ViewerConnection = z.infer<typeof connectionSchema>
export type ViewerError = z.infer<typeof errorSchema>

export interface Success<Value> {
  readonly ok: true
  readonly value: Value
}
export interface Failure {
  readonly error: ViewerError
  readonly ok: false
}
export type Result<Value> = Success<Value> | Failure

export const failure = (code: ViewerError['code']): Failure => ({error: {code}, ok: false})
export const success = <Value>(value: Value): Success<Value> => ({ok: true, value})
