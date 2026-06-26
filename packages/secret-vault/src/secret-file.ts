import fs from 'node:fs'

export const SECRET_FILE_MODE = 0o600

/** Writes a secret file with owner-only permissions. */
export const writeSecretFile = async (filePath: string, content: string) => {
  await fs.promises.writeFile(filePath, content, {encoding: 'utf8', mode: SECRET_FILE_MODE})
  await fs.promises.chmod(filePath, SECRET_FILE_MODE)
}
