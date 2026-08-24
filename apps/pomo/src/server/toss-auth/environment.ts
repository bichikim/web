import 'server-only'

export interface TossAuthEnvironment {
  readonly POMO_TOSS_CALLBACK_AUTHORIZATION?: string
  readonly POMO_TOSS_MTLS_CERT?: string
  readonly POMO_TOSS_MTLS_KEY?: string
}

const BASIC_AUTH_PREFIX = 'Basic '

export const getTossCallbackAuthorization = (
  environment: TossAuthEnvironment = process.env,
): string => {
  const authorization = environment.POMO_TOSS_CALLBACK_AUTHORIZATION?.trim()

  if (
    !authorization?.startsWith(BASIC_AUTH_PREFIX) ||
    authorization.length <= BASIC_AUTH_PREFIX.length
  ) {
    throw new TypeError('POMO_TOSS_CALLBACK_AUTHORIZATION must contain a Basic authorization value')
  }

  return authorization
}

export interface TossMtlsCredentials {
  readonly certificate: string
  readonly privateKey: string
}

const readPem = (name: string, value: string | undefined): string => {
  const pem = value?.replaceAll('\\n', '\n').trim()

  if (!pem) {
    throw new TypeError(`${name} is not set`)
  }

  return pem
}

export const getTossMtlsCredentials = (
  environment: TossAuthEnvironment = process.env,
): TossMtlsCredentials => ({
  certificate: readPem('POMO_TOSS_MTLS_CERT', environment.POMO_TOSS_MTLS_CERT),
  privateKey: readPem('POMO_TOSS_MTLS_KEY', environment.POMO_TOSS_MTLS_KEY),
})
