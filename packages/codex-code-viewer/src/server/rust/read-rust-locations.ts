import {fileURLToPath} from 'node:url'
import {z} from 'zod'
import {type CodeLocation, failure, type Result, success} from '../../shared/contracts'
const position = z.object({
  character: z.number().int().nonnegative(),
  line: z.number().int().nonnegative(),
})
const range = z.object({end: position, start: position})
const location = z.object({range, uri: z.string()})
const link = z.object({targetRange: range, targetSelectionRange: range, targetUri: z.string()})
const response = z.union([location, z.array(z.union([location, link])), z.null()])

export const readRustLocations = (value: unknown): Result<CodeLocation[]> => {
  const parsed = response.safeParse(value)
  if (!parsed.success) {
    return failure('rust-analysis-failed')
  }
  const targets =
    parsed.data === null ? [] : Array.isArray(parsed.data) ? parsed.data : [parsed.data]
  try {
    return success(
      targets.map((target) => {
        const start = 'targetUri' in target ? target.targetSelectionRange.start : target.range.start
        return {
          column: start.character + 1,
          line: start.line + 1,
          path: fileURLToPath('targetUri' in target ? target.targetUri : target.uri),
        }
      }),
    )
  } catch {
    return failure('rust-analysis-failed')
  }
}
