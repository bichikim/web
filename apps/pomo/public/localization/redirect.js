const readLocaleCookie = (cookieName, supportedLocales) => {
  const encodedLocale = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)

  if (encodedLocale === undefined) {
    return undefined
  }

  try {
    const locale = decodeURIComponent(encodedLocale)
    return supportedLocales.includes(locale) ? locale : undefined
  } catch {
    return undefined
  }
}

const readLocaleStorage = (storageKey, supportedLocales) => {
  try {
    const locale = localStorage.getItem(storageKey)
    return locale !== null && supportedLocales.includes(locale) ? locale : undefined
  } catch {
    return undefined
  }
}

const readRedirectConfig = () => {
  const script = document.currentScript
  const cookieName = script?.dataset.cookieName
  const localizedRoutes = script?.dataset.localizedRoutes?.split(',') ?? []
  const storageKey = script?.dataset.storageKey
  const supportedLocales = script?.dataset.locales?.split(',') ?? []

  if (
    cookieName === undefined ||
    localizedRoutes.length === 0 ||
    storageKey === undefined ||
    supportedLocales.length === 0
  ) {
    return undefined
  }

  return {cookieName, localizedRoutes, storageKey, supportedLocales}
}

const isLocalizedPath = (supportedLocales) => {
  const [, pathLocale] = location.pathname.split('/')

  return pathLocale !== '' && supportedLocales.includes(pathLocale)
}

const isRedirectablePath = (localizedRoutes) => {
  const canonicalPath = location.pathname.replace(/\/+$/u, '') || '/'

  return localizedRoutes.includes(canonicalPath)
}

const redirectToPreferredLocale = () => {
  const config = readRedirectConfig()

  if (config === undefined) {
    return
  }

  if (isLocalizedPath(config.supportedLocales) || !isRedirectablePath(config.localizedRoutes)) {
    return
  }

  const locale =
    readLocaleStorage(config.storageKey, config.supportedLocales) ??
    readLocaleCookie(config.cookieName, config.supportedLocales)

  if (locale === undefined) {
    return
  }

  const canonicalPath = location.pathname.replace(/\/+$/u, '') || '/'
  const localizedPath = canonicalPath === '/' ? `/${locale}/` : `/${locale}${canonicalPath}/`
  location.replace(`${localizedPath}${location.search}${location.hash}`)
}

redirectToPreferredLocale()
