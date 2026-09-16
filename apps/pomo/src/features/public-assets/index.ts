import {getRequestEvent} from 'solid-js/web'
import type {z} from 'zod'

const TRUSTED_LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost'])
const PUBLIC_ASSET_VALIDATION_ORIGIN = 'https://public-assets.invalid'

export type PublicAssetPath = `/${string}`

export interface PublicJsonErrorContext {
  readonly path: PublicAssetPath
  readonly status?: number
}

export type PublicJsonErrorFormatter = (context: PublicJsonErrorContext) => string

export type PublicJsonParser<Output> = (value: unknown) => Output | PromiseLike<Output>

export interface LoadPublicJsonOptions {
  readonly formatFetchFailure?: PublicJsonErrorFormatter
  readonly formatInvalid?: PublicJsonErrorFormatter
  readonly formatParseFailure?: PublicJsonErrorFormatter
}

const isPublicAssetPath = (pathname: string): pathname is PublicAssetPath => {
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.startsWith('/\\')) {
    return false
  }

  try {
    return (
      new URL(pathname, PUBLIC_ASSET_VALIDATION_ORIGIN).origin === PUBLIC_ASSET_VALIDATION_ORIGIN
    )
  } catch {
    return false
  }
}

/** Resolves a public asset against the current trusted rendering origin. */
export const getPublicAssetUrl = (pathname: PublicAssetPath): string => {
  if (!isPublicAssetPath(pathname)) {
    throw new Error('Invalid public asset path.')
  }

  const requestUrlValue = getRequestEvent()?.request.url

  if (requestUrlValue === undefined) {
    return pathname
  }

  const requestUrl = new URL(requestUrlValue)
  const assetOrigin = new URL(import.meta.env.POMO_PUBLIC_ASSET_ORIGIN)
  const canUseLocalOrigin =
    import.meta.env.POMO_ALLOW_LOCAL_ASSET_ORIGIN === 'true' &&
    TRUSTED_LOCAL_HOSTNAMES.has(requestUrl.hostname)
  const trustedOrigin =
    requestUrl.origin === assetOrigin.origin || canUseLocalOrigin ? requestUrl : assetOrigin

  return new URL(pathname, trustedOrigin).href
}

const getDefaultFetchErrorFormatter: PublicJsonErrorFormatter = ({path, status}) =>
  status === undefined
    ? `Failed to fetch public JSON asset: ${path}`
    : `Failed to fetch public JSON asset: ${status}`

const getDefaultParseErrorFormatter: PublicJsonErrorFormatter = ({path}) =>
  `Failed to parse public JSON asset: ${path}`

const getDefaultInvalidErrorFormatter: PublicJsonErrorFormatter = ({path}) =>
  `Invalid public JSON asset: ${path}`

const createPublicJsonError = (
  formatter: PublicJsonErrorFormatter | undefined,
  context: PublicJsonErrorContext,
  fallback: PublicJsonErrorFormatter,
  cause?: unknown,
): Error => {
  const errorMessage = (formatter ?? fallback)(context)

  return cause === undefined ? new Error(errorMessage) : new Error(errorMessage, {cause})
}

const validatePublicJson = async <Output>(
  value: unknown,
  validator: z.ZodType<Output> | PublicJsonParser<Output>,
  pathname: PublicAssetPath,
  options: LoadPublicJsonOptions,
): Promise<Output> => {
  if (typeof validator === 'function') {
    return validator(value)
  }

  const result = await validator.safeParseAsync(value)

  if (!result.success) {
    throw createPublicJsonError(
      options.formatInvalid,
      {path: pathname},
      getDefaultInvalidErrorFormatter,
      result.error,
    )
  }

  return result.data
}

/** Fetches a public JSON asset and validates its response with a Zod schema or parser. */
export const loadPublicJson = async <Output>(
  pathname: PublicAssetPath,
  validator: z.ZodType<Output> | PublicJsonParser<Output>,
  options: LoadPublicJsonOptions = {},
): Promise<Output> => {
  const assetUrl = getPublicAssetUrl(pathname)
  let response: Response

  try {
    response = await fetch(assetUrl)
  } catch (cause: unknown) {
    throw createPublicJsonError(
      options.formatFetchFailure,
      {path: pathname},
      getDefaultFetchErrorFormatter,
      cause,
    )
  }

  if (!response.ok) {
    throw createPublicJsonError(
      options.formatFetchFailure,
      {path: pathname, status: response.status},
      getDefaultFetchErrorFormatter,
    )
  }

  let value: unknown

  try {
    value = await response.json()
  } catch (cause: unknown) {
    throw createPublicJsonError(
      options.formatParseFailure,
      {path: pathname},
      getDefaultParseErrorFormatter,
      cause,
    )
  }

  return validatePublicJson(value, validator, pathname, options)
}
