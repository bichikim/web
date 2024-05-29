import fs from 'node:fs'
import {generateFiles, GenerateOptions} from './generate-files'
import path from 'node:path'

export const generator = async (options: GenerateOptions) => {
  const {dist = 'generated.ts', cwd} = options
  const code = await generateFiles(options)

  if (!code) {
    return
  }

  return fs.writeFileSync(path.resolve(cwd, dist), code)
}
