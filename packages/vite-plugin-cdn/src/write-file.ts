import path from 'node:path'
import fs from 'node:fs'

export const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), {recursive: true})
  await fs.promises.writeFile(filePath, content)

  return filePath
}
