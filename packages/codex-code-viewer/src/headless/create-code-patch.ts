import {createPatch} from 'diff'

interface CodePatchOptions {
  readonly path: string
  readonly original: string
  readonly source: string
}
const CONTEXT_LINES = 3
const MAX_EDIT_LENGTH = 512

/** Computes a bounded draft diff against the last read or saved source. */
export const createCodePatch = (options: CodePatchOptions): string | undefined =>
  createPatch(
    options.path,
    options.original,
    options.source,
    'Last read or saved',
    'Unsaved draft',
    {
      context: CONTEXT_LINES,
      maxEditLength: MAX_EDIT_LENGTH,
    },
  )
