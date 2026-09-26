import {parseRepositoryId, type RepositoryIdFailure} from '../domain/repository-id'

export interface RepositoryProbeValue {
  readonly commit: string
  readonly originRemote?: string
  readonly ref?: string
  readonly root: string
}

export interface RepositoryProbeError {
  readonly code: 'repository-unavailable'
  readonly detail: string
  readonly operation: 'inspect'
  readonly retryable: false
}

export type RepositoryProbeResult =
  | {readonly ok: true; readonly value: RepositoryProbeValue}
  | {readonly error: RepositoryProbeError; readonly ok: false}

export interface RepositoryProbe {
  readonly inspect: (inputPath: string) => Promise<RepositoryProbeResult>
}

export interface RepositoryIdentity {
  readonly commit: string
  readonly repoId: string
  readonly root: string
  readonly workspaceId: string
}

export interface ResolveRepositoryIdentityOptions {
  readonly configuredRepoId?: string
  readonly inputPath: string
  readonly probe: RepositoryProbe
}

export type ResolveRepositoryIdentityResult =
  | {readonly ok: true; readonly value: RepositoryIdentity}
  | {readonly error: RepositoryIdFailure['error'] | RepositoryProbeError; readonly ok: false}

export const resolveRepositoryIdentity = async (
  options: ResolveRepositoryIdentityOptions,
): Promise<ResolveRepositoryIdentityResult> => {
  const inspected = await options.probe.inspect(options.inputPath)
  if (!inspected.ok) {
    return inspected
  }

  const {commit, originRemote, ref, root} = inspected.value
  let repoId = options.configuredRepoId

  if (repoId === undefined) {
    const parsed = parseRepositoryId(originRemote ?? '')
    if (!parsed.ok) {
      return parsed
    }
    repoId = parsed.value
  }

  return {
    ok: true,
    value: {
      commit,
      repoId,
      root,
      workspaceId: ref ?? `commit:${commit}`,
    },
  }
}
