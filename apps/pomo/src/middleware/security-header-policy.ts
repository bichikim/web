import {compileStringTemplate} from '@winter-love/utils'

export const BASE_SECURITY_HEADERS = {
  'Permissions-Policy': import.meta.env.POMO_PERMISSIONS_POLICY,
  'Referrer-Policy': import.meta.env.POMO_REFERRER_POLICY,
  'X-Content-Type-Options': import.meta.env.POMO_CONTENT_TYPE_OPTIONS,
} as const

const renderContentSecurityPolicy = compileStringTemplate(
  import.meta.env.POMO_CONTENT_SECURITY_POLICY_TEMPLATE,
)
const renderWorkerContentSecurityPolicy = compileStringTemplate(
  import.meta.env.POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE,
)

export const createContentSecurityPolicy = (nonce?: string): string => {
  const scriptSources = ["'self'", ...(nonce === undefined ? [] : [`'nonce-${nonce}'`])]
  const styleSources = ["'self'", ...(nonce === undefined ? [] : [`'nonce-${nonce}'`])]

  return renderContentSecurityPolicy({
    CONNECT_SOURCES: import.meta.env.POMO_CONNECT_SOURCES,
    SCRIPT_SOURCES: scriptSources.join(' '),
    STYLE_SOURCES: styleSources.join(' '),
  })
}

const createWorkerContentSecurityPolicy = (): string =>
  renderWorkerContentSecurityPolicy({CONNECT_SOURCES: import.meta.env.POMO_CONNECT_SOURCES})

export const STATIC_SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'Content-Security-Policy-Report-Only': createContentSecurityPolicy(),
} as const

export const WORKER_SECURITY_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'Content-Security-Policy-Report-Only': createWorkerContentSecurityPolicy(),
} as const
