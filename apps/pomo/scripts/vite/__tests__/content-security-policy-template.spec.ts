/** @vitest-environment node */
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
const PRODUCTION_DEPLOYMENT = {
  command: 'build',
  publicOrigin: 'https://www.pomofi.io',
  vercelEnvironment: 'production',
} as const

describe('resolveContentSecurityPolicyTemplates', () => {
  it('should return the default page and worker templates', () => {
    expect(resolveContentSecurityPolicyTemplates({}, PRODUCTION_DEPLOYMENT)).toEqual({
      page: DEFAULT_PAGE_TEMPLATE,
      worker: DEFAULT_WORKER_TEMPLATE,
    })
  })

  it('should use the defaults for blank environment values', () => {
    expect(
      resolveContentSecurityPolicyTemplates(
        {
          POMO_CONTENT_SECURITY_POLICY_TEMPLATE: '   ',
          POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE: '\n\t',
        },
        PRODUCTION_DEPLOYMENT,
      ),
    ).toEqual({
      page: DEFAULT_PAGE_TEMPLATE,
      worker: DEFAULT_WORKER_TEMPLATE,
    })
  })

  it('should trim deployment-specific page and worker templates', () => {
    expect(
      resolveContentSecurityPolicyTemplates(
        {
          POMO_CONTENT_SECURITY_POLICY_TEMPLATE: '  page {{SCRIPT_SOURCES}}  ',
          POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE: '\n worker {{CONNECT_SOURCES}}\t',
        },
        PRODUCTION_DEPLOYMENT,
      ),
    ).toEqual({
      page: 'page {{SCRIPT_SOURCES}}',
      worker: 'worker {{CONNECT_SOURCES}}',
    })
  })

  it('should allow the Vercel Live frame on a non-Pomofi origin', () => {
    expect(
      resolveContentSecurityPolicyTemplates(
        {},
        {...PRODUCTION_DEPLOYMENT, publicOrigin: 'https://dev.pomofi.io'},
      ).page,
    ).toContain("frame-src 'self' https://vercel.live")
  })

  it('should allow the Vercel Live frame while serving locally', () => {
    expect(
      resolveContentSecurityPolicyTemplates({}, {...PRODUCTION_DEPLOYMENT, command: 'serve'}).page,
    ).toContain("frame-src 'self' https://vercel.live")
  })

  it('should not allow the Vercel Live frame on the Pomofi apex origin', () => {
    expect(
      resolveContentSecurityPolicyTemplates(
        {},
        {...PRODUCTION_DEPLOYMENT, publicOrigin: 'https://pomofi.io'},
      ).page,
    ).not.toContain('https://vercel.live')
  })

  it('should allow the Vercel Live frame on a Vercel preview deployment', () => {
    expect(
      resolveContentSecurityPolicyTemplates(
        {},
        {...PRODUCTION_DEPLOYMENT, vercelEnvironment: 'preview'},
      ).page,
    ).toContain("frame-src 'self' https://vercel.live")
  })

  it('should merge the Vercel Live frame source into a custom frame-src directive', () => {
    const templates = resolveContentSecurityPolicyTemplates(
      {
        POMO_CONTENT_SECURITY_POLICY_TEMPLATE:
          "default-src 'self'; frame-src https://calendar.example",
      },
      {...PRODUCTION_DEPLOYMENT, publicOrigin: 'https://dev.pomofi.io'},
    )

    expect(templates.page).toContain('frame-src https://calendar.example https://vercel.live')
  })

  it('should not duplicate the Vercel Live frame source when already allowed', () => {
    const templates = resolveContentSecurityPolicyTemplates(
      {POMO_CONTENT_SECURITY_POLICY_TEMPLATE: "default-src 'self'; frame-src https://vercel.live"},
      {...PRODUCTION_DEPLOYMENT, publicOrigin: 'https://dev.pomofi.io'},
    )

    expect(templates.page.match(/https:\/\/vercel\.live/gu)).toHaveLength(1)
  })

  it('should not treat a lookalike frame source as the Vercel Live origin', () => {
    const templates = resolveContentSecurityPolicyTemplates(
      {
        POMO_CONTENT_SECURITY_POLICY_TEMPLATE:
          "default-src 'self'; frame-src https://vercel.live.attacker.example https://attacker.example/https://vercel.live",
      },
      {...PRODUCTION_DEPLOYMENT, publicOrigin: 'https://dev.pomofi.io'},
    )

    expect(templates.page).toContain(
      'frame-src https://vercel.live.attacker.example https://attacker.example/https://vercel.live https://vercel.live',
    )
  })

  it('should leave a custom frame-src directive unchanged on the production origin', () => {
    const template = "default-src 'self'; frame-src https://calendar.example"

    expect(
      resolveContentSecurityPolicyTemplates(
        {POMO_CONTENT_SECURITY_POLICY_TEMPLATE: template},
        PRODUCTION_DEPLOYMENT,
      ).page,
    ).toBe(template)
  })
})
