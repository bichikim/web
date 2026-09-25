export interface ContentSecurityPolicyEnvironment {
  readonly POMO_CONTENT_SECURITY_POLICY_TEMPLATE?: string
  readonly POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE?: string
}

export interface ContentSecurityPolicyTemplates {
  readonly page: string
  readonly worker: string
}

export interface ContentSecurityPolicyDeploymentContext {
  readonly command: 'build' | 'serve'
  readonly publicOrigin: string
  readonly vercelEnvironment: string | undefined
}

const addVercelLiveFrameSource = (template: string): string => {
  const directives = template
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean)
  const frameDirectiveIndex = directives.findIndex(
    (directive) => directive.split(/\s+/u, 1)[0]?.toLowerCase() === 'frame-src',
  )

  if (frameDirectiveIndex === -1) {
    directives.push("frame-src 'self' https://vercel.live")
    return directives.join('; ')
  }

  const frameDirective = directives[frameDirectiveIndex]
  const frameSources = frameDirective.split(/\s+/u)
  if (frameSources.includes('https://vercel.live')) {
    return directives.join('; ')
  }

  directives[frameDirectiveIndex] = `${frameDirective} https://vercel.live`
  return directives.join('; ')
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
  deployment: ContentSecurityPolicyDeploymentContext,
): ContentSecurityPolicyTemplates => {
  const publicHostname = new URL(deployment.publicOrigin).hostname
  const isPomofiDomain = publicHostname === 'pomofi.io' || publicHostname === 'www.pomofi.io'
  const isNonProductionVercelDeployment =
    deployment.vercelEnvironment !== undefined && deployment.vercelEnvironment !== 'production'
  const pageTemplate =
    environment.POMO_CONTENT_SECURITY_POLICY_TEMPLATE?.trim() || DEFAULT_PAGE_TEMPLATE
  const workerTemplate =
    environment.POMO_WORKER_CONTENT_SECURITY_POLICY_TEMPLATE?.trim() || DEFAULT_WORKER_TEMPLATE

  return {
    page:
      deployment.command === 'serve' || isNonProductionVercelDeployment || !isPomofiDomain
        ? addVercelLiveFrameSource(pageTemplate)
        : pageTemplate,
    worker: workerTemplate,
  }
}
