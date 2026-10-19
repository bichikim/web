interface FollowInput {
  readonly tool: string
  readonly file_path?: unknown
  readonly offset?: unknown
  readonly agentId?: unknown
}
interface FollowLocation {
  readonly path: string
  readonly line: number
  readonly column: number
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const positiveLine = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
const changedLine = (patch: unknown): number | undefined => {
  if (!Array.isArray(patch)) {
    return undefined
  }
  for (const hunk of patch) {
    if (isRecord(hunk) && positiveLine(hunk.newStart) && Array.isArray(hunk.lines)) {
      const changed = hunk.lines.findIndex(
        (text) => typeof text === 'string' && (text.startsWith('+') || text.startsWith('-')),
      )
      if (changed >= 0) {
        return (
          hunk.newStart +
          hunk.lines
            .slice(0, changed)
            .filter((text) => typeof text === 'string' && text.startsWith(' ')).length
        )
      }
    }
  }
  return undefined
}

/** Resolves the displayed location of a successful main-thread text read or file change. */
export const readToolLocation = (
  input: FollowInput,
  outcome: unknown,
): FollowLocation | undefined => {
  if (
    input.agentId !== undefined ||
    !isRecord(outcome) ||
    outcome.deny !== undefined ||
    outcome.isError
  ) {
    return undefined
  }
  const {result} = outcome
  if (!isRecord(result) || result.staged === true) {
    return undefined
  }
  let path = result.filePath ?? input.file_path
  let line: unknown
  switch (input.tool) {
    case 'Read':
      if (result.type !== 'text' || !isRecord(result.file)) {
        return undefined
      }
      path = result.file.filePath ?? input.file_path
      line = result.file.startLine ?? input.offset ?? 1
      break
    case 'Edit':
    case 'Write':
      line = changedLine(result.structuredPatch) ?? 1
      break
    default:
      return undefined
  }
  return typeof path === 'string' && path.length > 0 && positiveLine(line)
    ? {column: 1, line, path}
    : undefined
}
