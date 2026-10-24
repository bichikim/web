import {describe, expect, it, vi} from 'vitest'

import {type RepositoryProbe, resolveRepositoryIdentity} from '../repository'

const createProbe = (value: {
  readonly commit: string
  readonly originRemote?: string
  readonly ref?: string
  readonly root: string
}): RepositoryProbe => ({inspect: vi.fn(async () => ({ok: true as const, value}))})

describe('resolveRepositoryIdentity', () => {
  it('should derive a machine-independent repository and branch identity', async () => {
    const probe = createProbe({
      commit: 'abc123',
      originRemote: 'git@github.com:bichikim/web.git',
      ref: 'refs/heads/dev',
      root: '/canonical/repository',
    })

    await expect(
      resolveRepositoryIdentity({inputPath: '/different/location', probe}),
    ).resolves.toEqual({
      ok: true,
      value: {
        commit: 'abc123',
        repoId: 'github.com/bichikim/web',
        root: '/canonical/repository',
        workspaceId: 'refs/heads/dev',
      },
    })
    expect(probe.inspect).toHaveBeenCalledWith('/different/location')
  })

  it('should use a configured repository ID without an origin remote', async () => {
    const probe = createProbe({commit: 'abc123', ref: 'refs/heads/dev', root: '/repository'})

    await expect(
      resolveRepositoryIdentity({
        configuredRepoId: 'internal/project',
        inputPath: '/repository',
        probe,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {repoId: 'internal/project'},
    })
  })

  it('should scope a detached checkout by commit', async () => {
    const probe = createProbe({
      commit: 'abc123',
      originRemote: 'https://github.com/bichikim/web.git',
      root: '/repository',
    })

    await expect(
      resolveRepositoryIdentity({inputPath: '/repository', probe}),
    ).resolves.toMatchObject({
      ok: true,
      value: {workspaceId: 'commit:abc123'},
    })
  })

  it('should return the probe error without replacing its evidence', async () => {
    const error = {
      code: 'repository-unavailable',
      detail: 'not a repository',
      operation: 'inspect',
      retryable: false,
    } as const
    const probe: RepositoryProbe = {
      inspect: vi.fn(async () => ({error, ok: false as const})),
    }

    await expect(resolveRepositoryIdentity({inputPath: '/missing', probe})).resolves.toEqual({
      error,
      ok: false,
    })
  })

  it('should reject an unsupported origin when no repository ID is configured', async () => {
    const probe = createProbe({
      commit: 'abc123',
      originRemote: '/local/repository',
      root: '/repository',
    })

    await expect(resolveRepositoryIdentity({inputPath: '/repository', probe})).resolves.toEqual({
      error: {code: 'unsupported-remote', remote: '/local/repository'},
      ok: false,
    })
  })
})
