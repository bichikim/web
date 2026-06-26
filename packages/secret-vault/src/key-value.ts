import {SecretVaultError} from './errors'

const stripMatchingQuotes = (value: string) => {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

export interface ParsedAssignment {
  readonly key: string
  readonly value: string
}

export const parseKey = (input: string) => {
  const key = stripMatchingQuotes(input)

  if (key === '') {
    throw new SecretVaultError('Secret key must not be empty')
  }

  if (key.includes('=')) {
    throw new SecretVaultError('Secret key must not contain "="')
  }

  return key
}

export const parseAssignment = (input: string): ParsedAssignment => {
  const separatorIndex = input.indexOf('=')

  if (separatorIndex < 0) {
    throw new SecretVaultError('Expected KEY=VALUE')
  }

  const key = stripMatchingQuotes(input.slice(0, separatorIndex))
  const value = stripMatchingQuotes(input.slice(separatorIndex + 1))

  parseKey(key)

  return {key, value}
}

export const parseDotenv = (content: string) => {
  const values: Record<string, string> = {}

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (line !== '' && !line.startsWith('#')) {
      const {key, value} = parseAssignment(line)

      values[key] = value
    }
  }

  return values
}

export const formatDotenv = (values: Record<string, string>) =>
  Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join('\n')
