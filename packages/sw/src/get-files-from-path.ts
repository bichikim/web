import {glob} from 'glob'

export async function getFilesFromPath(path: string, pattern: string = '**/*'): Promise<string[]> {
  return glob(pattern, {
    cwd: path,
    nodir: true,
  })
}
