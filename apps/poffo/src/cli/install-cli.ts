import {lstat, mkdir, readFile, readlink, realpath, symlink, writeFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {delimiter, join, resolve} from 'node:path'

const pointsToExecutable = async (path: string, executable: string) => {
  if ((await readlink(path)) === executable) {
    return true
  }
  const existing = await realpath(path).catch(() => undefined)
  return existing !== undefined && existing === (await realpath(executable))
}

/** Registers the installed native launcher in a user-selected bin directory without replacing other commands. */
export const installCli = async (directory?: string) => {
  const executable = process.env.POFFO_CLI_EXECUTABLE
  if (executable === undefined) {
    throw new Error('requires-installed-cli: use the launcher inside the Poffo app')
  }
  const windows = process.platform === 'win32'
  const root = resolve(
    directory ??
      (windows
        ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Poffo', 'bin')
        : join(homedir(), '.local', 'bin')),
  )
  await mkdir(root, {recursive: true})
  const path = join(root, windows ? 'poffo.cmd' : 'poffo')
  const content = `@echo off\r\n"${executable.replaceAll('%', '%%')}" %*\r\n`
  const existing = await lstat(path).catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  })
  if (existing !== undefined) {
    const matches = windows
      ? (await readFile(path, 'utf8')) === content
      : existing.isSymbolicLink() && (await pointsToExecutable(path, executable))
    if (!matches) {
      throw new Error('command-exists: choose another directory')
    }
  } else if (windows) {
    await writeFile(path, content, {flag: 'wx'})
  } else {
    await symlink(executable, path)
  }
  return {
    inPath: (process.env.PATH ?? '').split(delimiter).some((entry) => resolve(entry) === root),
    path,
  }
}
