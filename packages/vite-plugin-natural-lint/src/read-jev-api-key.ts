import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {parseEnv} from 'node:util'

export const readJevApiKey = async (
  root: string,
  environmentKey: string | undefined,
): Promise<string> => {
  const key = environmentKey?.trim()
  if (key) {
    return key
  }

  let projectKey: string | undefined
  try {
    const contents = await readFile(path.join(root, '.env.local'), 'utf8')
    projectKey = parseEnv(contents).TYPESAFE_API_KEY?.trim()
  } catch (error: unknown) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error
    }
  }
  if (projectKey) {
    return projectKey
  }
  throw new Error('Jev requires TYPESAFE_API_KEY in the process environment or project .env.local.')
}
