import {readFile} from 'node:fs/promises'
import {join} from 'node:path'

export const readRuntimeInfo = async () => {
  const root = process.env.POFFO_RUNTIME_ROOT
  return {
    executable: process.execPath,
    manifest:
      root === undefined
        ? null
        : (JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')) as unknown),
    node: process.version,
    packaged: root !== undefined,
    runtime: root,
  }
}
