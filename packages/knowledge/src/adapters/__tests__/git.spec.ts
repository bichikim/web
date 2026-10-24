import {describe, expect, it, vi} from 'vitest'

import {createGitRepositoryProbe, type GitCommandRunner} from '../git'

const createRunner = (responses: Readonly<Record<string, string>>): GitCommandRunner => ({
  run: vi.fn(async (arguments_) => {
    const command = arguments_.join(' ')
    const stdout = responses[command]
    if (stdout === undefined) {
      throw new Error(`unexpected command: ${command}`)
    }
    return {stdout}
  }),
})

describe('createGitRepositoryProbe', () => {
  it('should inspect a canonical repository root, remote, ref and commit', async () => {
    const runner = createRunner({
      '-C /input rev-parse --show-toplevel': '/linked/repository\n',
      '-C /repository remote get-url origin': 'git@github.com:bichikim/web.git\n',
      '-C /repository rev-parse HEAD': 'abc123\n',
      '-C /repository symbolic-ref --quiet HEAD': 'refs/heads/dev\n',
    })
    const probe = createGitRepositoryProbe({
      realpath: vi.fn(async () => '/repository'),
      runner,
    })

    await expect(probe.inspect('/input')).resolves.toEqual({
      ok: true,
      value: {
        commit: 'abc123',
        originRemote: 'git@github.com:bichikim/web.git',
        ref: 'refs/heads/dev',
        root: '/repository',
      },
    })
  })

  it('should tolerate a repository without an origin or symbolic ref', async () => {
    const runner = createRunner({
      '-C /input rev-parse --show-toplevel': '/repository',
      '-C /repository rev-parse HEAD': 'abc123',
    })
    const probe = createGitRepositoryProbe({realpath: vi.fn(async (path) => path), runner})

    await expect(probe.inspect('/input')).resolves.toEqual({
      ok: true,
      value: {commit: 'abc123', root: '/repository'},
    })
  })

  it('should normalize Git failures into a repository error', async () => {
    const runner: GitCommandRunner = {
      run: vi.fn(async () => {
        throw new Error('not a git repository')
      }),
    }
    const probe = createGitRepositoryProbe({runner})

    await expect(probe.inspect('/missing')).resolves.toEqual({
      error: {
        code: 'repository-unavailable',
        detail: 'not a git repository',
        operation: 'inspect',
        retryable: false,
      },
      ok: false,
    })
  })

  it('should stringify a non-Error Git failure', async () => {
    const runner: GitCommandRunner = {
      run: vi.fn(async () => {
        // oxlint-disable-next-line prefer-promise-reject-errors -- exercises the unknown error boundary.
        return Promise.reject('git stopped')
      }),
    }
    const probe = createGitRepositoryProbe({runner})

    await expect(probe.inspect('/missing')).resolves.toMatchObject({
      error: {detail: 'git stopped'},
      ok: false,
    })
  })
})
