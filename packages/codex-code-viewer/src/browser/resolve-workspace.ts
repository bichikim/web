import {execFile} from 'node:child_process'
import {realpath, stat} from 'node:fs/promises'
import {isAbsolute} from 'node:path'
import {promisify} from 'node:util'

const execute = promisify(execFile)
const repository = async (directory: string): Promise<string> => {
  const {stdout} = await execute('git', [
    '-C',
    directory,
    'rev-parse',
    '--path-format=absolute',
    '--git-common-dir',
  ])
  return realpath(stdout.trim())
}

/** Resolves the launch folder or a linked worktree of the same Git repository. */
export const resolveWorkspace = async (
  root: string,
  requested: string,
): Promise<string | undefined> => {
  if (!isAbsolute(requested)) {
    return undefined
  }
  try {
    const directory = await realpath(requested)
    if (!(await stat(directory)).isDirectory()) {
      return undefined
    }
    if (directory === root) {
      return directory
    }
    const [original, candidate] = await Promise.all([repository(root), repository(directory)])
    return original === candidate ? directory : undefined
  } catch {
    return undefined
  }
}
