export interface ContentSecurityPolicyEnvironment {
  readonly POMO_CONTENT_SECURITY_POLICY_TEMPLATE?: string
  readonly POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE?: string
}

export interface ContentSecurityPolicyTemplates {
  readonly page: string
  readonly worker: string
}

const DEFAULT_PAGE_TEMPLATE = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src {{SCRIPT_SOURCES}} 'wasm-unsafe-eval'",
  'style-src {{STYLE_SOURCES}}',
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: https://storage.pomofi.io",
  "worker-src 'self' blob:",
  'connect-src {{CONNECT_SOURCES}}',
  "manifest-src 'self'",
].join('; ')
const DEFAULT_WORKER_TEMPLATE = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  'connect-src {{CONNECT_SOURCES}}',
].join('; ')

export const resolveContentSecurityPolicyTemplates = (
  environment: ContentSecurityPolicyEnvironment,
): ContentSecurityPolicyTemplates => ({
  page: environment.POMO_CONTENT_SECURITY_POLICY_TEMPLATE?.trim() || DEFAULT_PAGE_TEMPLATE,
  worker:
    environment.POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE?.trim() || DEFAULT_WORKER_TEMPLATE,
})
