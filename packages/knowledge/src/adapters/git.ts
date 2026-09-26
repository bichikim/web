import {execFile} from 'node:child_process'
import {realpath} from 'node:fs/promises'
import {promisify} from 'node:util'

import type {
  RepositoryProbe,
  RepositoryProbeError,
  RepositoryProbeResult,
} from '../source/repository'

export interface GitCommandOutput {
  readonly stdout: string
}

export interface GitCommandRunner {
  readonly run: (arguments_: ReadonlyArray<string>) => Promise<GitCommandOutput>
}

export interface CreateGitRepositoryProbeOptions {
  readonly realpath?: (path: string) => Promise<string>
  readonly runner?: GitCommandRunner
}

const execFileAsync = promisify(execFile)

const defaultRunner: GitCommandRunner = {
  async run(arguments_) {
    const {stdout} = await execFileAsync('git', [...arguments_], {encoding: 'utf8'})
    return {stdout}
  },
}

const detailFrom = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const unavailable = (error: unknown): RepositoryProbeError => ({
  code: 'repository-unavailable',
  detail: detailFrom(error),
  operation: 'inspect',
  retryable: false,
})

const output = async (
  runner: GitCommandRunner,
  root: string,
  arguments_: ReadonlyArray<string>,
): Promise<string> => {
  const result = await runner.run(['-C', root, ...arguments_])
  return result.stdout.trim()
}

const optionalOutput = async (
  runner: GitCommandRunner,
  root: string,
  arguments_: ReadonlyArray<string>,
): Promise<string | undefined> => {
  try {
    const value = await output(runner, root, arguments_)
    return value === '' ? undefined : value
  } catch {
    return undefined
  }
}

export const createGitRepositoryProbe = (
  options: CreateGitRepositoryProbeOptions = {},
): RepositoryProbe => {
  const runner = options.runner ?? defaultRunner
  const resolveRealpath = options.realpath ?? realpath

  return {
    async inspect(inputPath): Promise<RepositoryProbeResult> {
      try {
        const discoveredRoot = await output(runner, inputPath, ['rev-parse', '--show-toplevel'])
        const root = await resolveRealpath(discoveredRoot)
        const [commit, originRemote, ref] = await Promise.all([
          output(runner, root, ['rev-parse', 'HEAD']),
          optionalOutput(runner, root, ['remote', 'get-url', 'origin']),
          optionalOutput(runner, root, ['symbolic-ref', '--quiet', 'HEAD']),
        ])

        return {
          ok: true,
          value: {commit, originRemote, ref, root},
        }
      } catch (error) {
        return {error: unavailable(error), ok: false}
      }
    },
  }
}
