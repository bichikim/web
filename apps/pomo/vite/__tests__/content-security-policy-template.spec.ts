import {describe, expect, it} from 'vitest'

import {resolveContentSecurityPolicyTemplates} from '../content-security-policy-template'

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

describe('resolveContentSecurityPolicyTemplates', () => {
  it('should return the default page and worker templates', () => {
    expect(resolveContentSecurityPolicyTemplates({})).toEqual({
      page: DEFAULT_PAGE_TEMPLATE,
      worker: DEFAULT_WORKER_TEMPLATE,
    })
  })

  it('should use the defaults for blank environment values', () => {
    expect(
      resolveContentSecurityPolicyTemplates({
        POMO_CONTENT_SECURITY_POLICY_TEMPLATE: '   ',
        POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE: '\n\t',
      }),
    ).toEqual({
      page: DEFAULT_PAGE_TEMPLATE,
      worker: DEFAULT_WORKER_TEMPLATE,
    })
  })

  it('should trim deployment-specific page and worker templates', () => {
    expect(
      resolveContentSecurityPolicyTemplates({
        POMO_CONTENT_SECURITY_POLICY_TEMPLATE: '  page {{SCRIPT_SOURCES}}  ',
        POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE: '\n worker {{CONNECT_SOURCES}}\t',
      }),
    ).toEqual({
      page: 'page {{SCRIPT_SOURCES}}',
      worker: 'worker {{CONNECT_SOURCES}}',
    })
  })
})
