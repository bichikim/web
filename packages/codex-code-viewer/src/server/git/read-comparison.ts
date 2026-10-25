import {runGit} from './run-git'

export interface GitComparison {
  readonly base: string
  readonly revision: string | null
  readonly prefix: string
}

/** Uses the repository's default remote branch, falling back to HEAD or an unborn empty baseline. */
export const readComparison = async (
  root: string,
  signal?: AbortSignal,
): Promise<GitComparison | null> => {
  const prefix = await runGit(root, ['rev-parse', '--show-prefix'], signal)
  if (!prefix.ok) {
    return null
  }
  const remote = await runGit(
    root,
    ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'],
    signal,
  )
  const base = remote.ok ? remote.output.trim() : 'HEAD'
  const compared = await runGit(root, ['merge-base', 'HEAD', base], signal)
  const head = compared.ok
    ? compared
    : await runGit(root, ['rev-parse', '--verify', 'HEAD'], signal)
  return {
    base: compared.ok ? base : 'HEAD',
    prefix: prefix.output.replace(/\n$/u, ''),
    revision: head.ok ? head.output.trim() : null,
  }
}
