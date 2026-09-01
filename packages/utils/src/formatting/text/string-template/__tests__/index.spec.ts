import {describe, expect, it} from 'vitest'
import {compileStringTemplate} from '../'

describe('compileStringTemplate', () => {
  it('should compile and reuse named string variables', () => {
    const render = compileStringTemplate(
      'script-src {{ SCRIPT_SOURCES }}; style-src {{STYLE_SOURCES}}; report-to {{REPORT_TO}}',
    )

    expect(
      render({
        REPORT_TO: 'csp-endpoint',
        SCRIPT_SOURCES: "'self' 'sha256-script'",
        STYLE_SOURCES: "'self' 'sha256-style'",
      }),
    ).toBe(
      "script-src 'self' 'sha256-script'; style-src 'self' 'sha256-style'; report-to csp-endpoint",
    )
    expect(
      render({
        REPORT_TO: 'second-endpoint',
        SCRIPT_SOURCES: "'self' 'nonce-request'",
        STYLE_SOURCES: "'self' 'nonce-request'",
      }),
    ).toContain("script-src 'self' 'nonce-request'")
  })

  it('should preserve templates without variables', () => {
    const render = compileStringTemplate("default-src 'self'")

    expect(render({})).toBe("default-src 'self'")
  })

  it('should preserve replacement values without interpreting their contents', () => {
    const render = compileStringTemplate('{{VALUE}}')
    const value = `\${code} {{OTHER}}`

    expect(render({VALUE: value})).toBe(value)
  })

  it('should reject missing and inherited variables', () => {
    const render = compileStringTemplate('{{VALUE}}')
    const inheritedValues = Object.create({VALUE: 'inherited'}) as Record<string, string>

    expect(() => render({})).toThrow(new ReferenceError('Missing template variable: VALUE'))
    expect(() => render(inheritedValues)).toThrow(
      new ReferenceError('Missing template variable: VALUE'),
    )
  })

  it.each(['{{', 'before {{VALUE', '{{}}', '{{  }}', '{{INVALID-NAME}}', '{{a.b}}'])(
    'should reject an invalid template variable in %s',
    (template) => {
      expect(() => compileStringTemplate(template)).toThrow(SyntaxError)
    },
  )
})
