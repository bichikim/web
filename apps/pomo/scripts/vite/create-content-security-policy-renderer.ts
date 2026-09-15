import {compileStringTemplate} from '@winter-love/utils'

export interface ContentSecurityPolicyOptions {
  readonly scriptHashes?: ReadonlyArray<string>
  readonly styleHashes?: ReadonlyArray<string>
}

export interface ContentSecurityPolicyRenderer {
  (options?: ContentSecurityPolicyOptions): string
}

const createElementSources = (hashes: ReadonlyArray<string>): ReadonlyArray<string> => [
  "'self'",
  ...hashes.map((hash) => `'${hash}'`),
]

export const createContentSecurityPolicyRenderer = (
  template: string,
  connectSourceList: string,
): ContentSecurityPolicyRenderer => {
  const renderTemplate = compileStringTemplate(template)

  return (options: ContentSecurityPolicyOptions = {}): string => {
    const scriptSources = createElementSources(options.scriptHashes ?? [])
    const styleSources = createElementSources(options.styleHashes ?? [])

    return renderTemplate({
      CONNECT_SOURCES: connectSourceList,
      SCRIPT_SOURCES: scriptSources.join(' '),
      STYLE_SOURCES: styleSources.join(' '),
    })
  }
}
