export interface PrerenderSecurityRulesOptions {
  readonly headers: Record<string, string>
  readonly isStaticBuild: boolean
  readonly sharedStaticRoutes: ReadonlyArray<string>
}

export interface PrerenderSecurityRule {
  readonly headers: Record<string, string>
}

export type PrerenderSecurityRules = Record<string, PrerenderSecurityRule>

export const createPrerenderSecurityRules = ({
  headers,
  isStaticBuild,
  sharedStaticRoutes,
}: PrerenderSecurityRulesOptions): PrerenderSecurityRules =>
  Object.fromEntries(
    (isStaticBuild ? [...sharedStaticRoutes, '/account'] : sharedStaticRoutes).map((route) => [
      route,
      {headers},
    ]),
  )
