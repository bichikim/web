import {z} from 'zod'

export const changeKindSchema = z.enum(['added', 'modified', 'deleted'])
export type ChangeKind = z.infer<typeof changeKindSchema>
export const changedFileSchema = z.object({
  kind: changeKindSchema,
  openable: z.boolean(),
  path: z.string(),
})
export type ChangedFile = z.infer<typeof changedFileSchema>
export const workspaceChangesSchema = z.object({
  available: z.boolean(),
  base: z.string().nullable(),
  files: z.array(changedFileSchema),
})
export type WorkspaceChanges = z.infer<typeof workspaceChangesSchema>
export const fileBaselineSchema = z.object({
  available: z.boolean(),
  base: z.string().nullable(),
  source: z.string().nullable(),
})
export type FileBaseline = z.infer<typeof fileBaselineSchema>

export interface ChangeHunk {
  readonly kind: ChangeKind
  readonly oldStart: number
  readonly oldLines: readonly string[]
  readonly newStart: number
  readonly newLines: readonly string[]
}

export interface ChangePreview {
  readonly path: string
  readonly base: string | null
  readonly hunks: readonly ChangeHunk[]
  readonly unavailable?: boolean
}
