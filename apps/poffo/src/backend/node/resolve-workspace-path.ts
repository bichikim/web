import {realpath} from 'node:fs/promises'
import {basename, dirname, isAbsolute, relative, resolve} from 'node:path'

/** Resolves explicit file access within the selected workspace, including symlink targets. */
export const resolveWorkspacePath = async (
  workspace: string,
  path: string,
  mode: 'read' | 'write',
) => {
  const root = await realpath(workspace)
  const requested = resolve(root, path)
  const target =
    mode === 'read'
      ? await realpath(requested)
      : resolve(await realpath(dirname(requested)), basename(requested))
  const location = relative(root, target)
  if (
    location === '..' ||
    location.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(location)
  ) {
    throw new Error('outside-workspace: choose an input or output within the selected workspace')
  }
  return target
}
