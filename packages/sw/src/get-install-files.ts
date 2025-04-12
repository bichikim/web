import {getFilesFromPath} from './get-files-from-path'
import path from 'node:path'

export interface GetInstallFilesOptions {
  cwd?: string
  files: string
  root?: string
}

// https://www.eliostruyf.com/devhack-caching-data-vscode-extension/
export const getInstallFiles = async (options: GetInstallFilesOptions) => {
  const {cwd = process.cwd(), files, root = './'} = options

  const filesRoot = path.join(cwd, root)

  const list = await getFilesFromPath(filesRoot, files)

  return list.map((file) => {
    return path.join('/', file)
  })
}
