import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getInstallFiles} from './get-install-files'

export const INJECT_TARGET = '__inject_code__'
export const libraryRoot = path.dirname(fileURLToPath(new URL(import.meta.url)))

export interface GenerateSWOptions {
  assets: string
  assetsRoot: string
  cwd: string
}

export const generateSW = async (distribution: string, options: GenerateSWOptions) => {
  const {assets, assetsRoot, cwd = process.cwd()} = options
  const swFile = await fs.readFileSync(path.join(libraryRoot, 'sw.mjs'), 'utf8')
  const installFiles = await getInstallFiles({cwd, files: assets, root: assetsRoot})
  await fs.promises.writeFile(
    path.join(cwd, distribution),
    swFile.replace(INJECT_TARGET, JSON.stringify(installFiles)),
  )
}
