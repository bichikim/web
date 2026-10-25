import type {ChangeHunk} from '../shared/change-contracts'

/** Positions the inspection after the changed block, or at the gap left by removed lines. */
export const changeAnchor = (hunk: ChangeHunk, lineCount: number): number =>
  Math.min(lineCount, Math.max(0, hunk.newStart + hunk.newLines.length - 1))
