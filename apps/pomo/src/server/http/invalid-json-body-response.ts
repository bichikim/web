import type {JsonBodyResult} from './body'
import {noStoreJson} from './response'

const HTTP_BAD_REQUEST = 400

export interface InvalidJsonBodyResponseOptions {
  readonly error: string
  readonly cookies?: ReadonlyArray<string>
}

/** Returns a private validation response, preserving body-reader failure statuses and cookies. */
export const invalidJsonBodyResponse = (
  bodyResult: JsonBodyResult,
  options: InvalidJsonBodyResponseOptions,
): Response =>
  noStoreJson(
    {error: options.error},
    {
      cookies: options.cookies,
      status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
    },
  )
