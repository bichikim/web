import {SecretVaultError} from './errors'

export const parseJsonText = (content: string, source: string): unknown => {
  try {
    return JSON.parse(content)
  } catch {
    throw new SecretVaultError(`${source} is not valid JSON`)
  }
}
