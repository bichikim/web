import {MAX_CODE_BYTES} from './editing-limits'
import {z} from 'zod'

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
  lines: z.array(z.array(tokenSchema)),
  location: locationSchema,
  media: z
    .object({
      kind: z.enum(['image', 'video', 'audio', 'pdf', 'word', 'spreadsheet']),
      mimeType: z.string(),
      size: z.number().int().nonnegative(),
    })
    .optional(),
  revision: z.string(),
  source: z.string(),
})
export const mediaChunkSchema = z.object({data: z.string(), next: z.number().int().nonnegative()})
export const workspaceSessionSchema = z.object({
  session: z.string(),
  workspace: z.string(),
})
export const sessionSchema = workspaceSessionSchema.extend({document: documentSchema})
export const connectionSchema = z.union([sessionSchema, workspaceSessionSchema.strict()])
export const navigationSchema = z.object({locations: z.array(locationSchema)})
export const codeSourceSchema = z.object({path: z.string(), source: z.string().max(MAX_CODE_BYTES)})
export type CodeSource = z.infer<typeof codeSourceSchema>
export const filesSchema = z.object({paths: z.array(z.string())})
export const workspaceFileSchema = z.object({openable: z.boolean(), path: z.string()})
export const treeSchema = z.object({files: z.array(workspaceFileSchema), truncated: z.boolean()})
export type WorkspaceTree = z.infer<typeof treeSchema>
export type WorkspaceFile = z.infer<typeof workspaceFileSchema>
export const errorSchema = z.object({
  code: z.enum([
    'not-found',
    'outside-workspace',
    'unsupported-file',
    'too-large',
    'media-too-large',
    'host-path-missing',
    'session-expired',
    'invalid-position',
    'read-failed',
    'stale-document',
    'write-conflict',
    'write-failed',
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
