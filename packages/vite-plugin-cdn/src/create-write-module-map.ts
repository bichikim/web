import path from 'node:path'
import {DEFAULT_PREFIX} from './share'

export const createWriteModuleMap = (
  destinationPath: string,
  sourceMap: Record<string, string>,
  prefix = DEFAULT_PREFIX,
) => {
  const moduleMap: Record<string, string> = {}

  for (const [key, value] of Object.entries(sourceMap)) {
    moduleMap[path.join(destinationPath, prefix, key)] = value
  }

  return moduleMap
}
