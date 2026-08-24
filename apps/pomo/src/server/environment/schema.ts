interface StringOptions {
  readonly defaultValue?: string
  readonly minimumLength?: number
}

interface UrlOptions {
  readonly protocols: ReadonlyArray<string>
}

const readNormalizedString = (value: string | undefined): string | undefined => {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
}

export const readOptionalString = (value: string | undefined): string | undefined =>
  readNormalizedString(value)

export const readString = (
  name: string,
  value: string | undefined,
  options: StringOptions = {},
): string => {
  const normalizedValue = readNormalizedString(value) ?? options.defaultValue

  if (normalizedValue === undefined) {
    throw new TypeError(`${name} is not set`)
  }

  if (options.minimumLength !== undefined && normalizedValue.length < options.minimumLength) {
    throw new TypeError(`${name} must contain at least ${options.minimumLength} characters`)
  }

  return normalizedValue
}

export const readEnum = <const Value extends string>(
  name: string,
  value: string | undefined,
  values: ReadonlyArray<Value>,
  defaultValue?: Value,
): Value => {
  const normalizedValue = readOptionalString(value) ?? defaultValue

  for (const candidate of values) {
    if (candidate === normalizedValue) {
      return candidate
    }
  }

  throw new TypeError(`${name} must be one of: ${values.join(', ')}`)
}

export const readUrl = (name: string, value: string | undefined, options: UrlOptions): URL => {
  const normalizedValue = readString(name, value)
  let url: URL

  try {
    url = new URL(normalizedValue)
  } catch {
    throw new TypeError(`${name} must be a valid URL`)
  }

  if (!options.protocols.includes(url.protocol)) {
    throw new TypeError(`${name} must use ${options.protocols.join(' or ')}`)
  }

  return url
}

export const readPem = (
  name: string,
  value: string | undefined,
  labels: ReadonlyArray<string>,
): string => {
  const pem = readString(name, value).replaceAll('\\n', '\n').replaceAll('\r\n', '\n').trim()
  const hasExpectedEnvelope = labels.some(
    (label) =>
      pem.startsWith(`-----BEGIN ${label}-----\n`) && pem.endsWith(`-----END ${label}-----`),
  )

  if (!hasExpectedEnvelope) {
    throw new TypeError(`${name} must contain a valid PEM value`)
  }

  return pem
}
