import {existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {isWithin, readSource} from './file-access'

/** Selects the nearest Pyright configuration inside the viewer workspace. */
export const readPythonProject = (root: string, path: string): string => {
  let directory = dirname(path)
  while (isWithin(root, directory)) {
    if (existsSync(join(directory, 'pyrightconfig.json'))) {
      return directory
    }
    const configuration = readSource(root, join(directory, 'pyproject.toml'))
    if (configuration.ok && /^\s*\[tool\.pyright(?:\]|\.)/mu.test(configuration.value)) {
      return directory
    }
    if (directory === root) {
      return root
    }
    directory = dirname(directory)
  }
  return root
}
