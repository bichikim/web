import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {render} from '@opentui/solid'
import type {ReviewAnswer, ReviewCandidate} from '../review'
import {ReviewTui} from './ReviewTui'
import type {ReviewTuiCandidate} from './review-session'

const readCandidateSource = async (
  root: string,
  candidate: ReviewCandidate,
): Promise<ReviewTuiCandidate> => {
  try {
    return {candidate, source: await readFile(path.resolve(root, candidate.relativePath), 'utf8')}
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return {candidate, source: `[Could not read ${candidate.relativePath}]\n${message}`}
  }
}

export const runReviewTui = async (
  root: string,
  candidates: ReadonlyArray<ReviewCandidate>,
): Promise<ReadonlyMap<string, ReviewAnswer>> => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive review requires a TTY. Use --answers for non-interactive review.')
  }
  const entries = await Promise.all(
    candidates.map((candidate) => readCandidateSource(root, candidate)),
  )
  return new Promise((resolve, reject) => {
    render(() => <ReviewTui candidates={entries} onComplete={resolve} />, {
      exitOnCtrlC: false,
    }).catch(reject)
  })
}
