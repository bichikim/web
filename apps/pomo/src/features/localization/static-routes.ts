interface StaticLocalizationOptions {
  readonly locales: ReadonlyArray<string>
  readonly routes: ReadonlyArray<string>
}

export const LOCALIZED_STATIC_ROUTES = ['/', '/account'] as const

const localizeStaticRoute = (route: string, locale: string) =>
  route === '/' ? `/${locale}/` : `/${locale}${route}/`

export const createLocalizedStaticRoutes = (options: StaticLocalizationOptions) =>
  options.routes.flatMap((route) =>
    options.locales.map((locale) => localizeStaticRoute(route, locale)),
  )
