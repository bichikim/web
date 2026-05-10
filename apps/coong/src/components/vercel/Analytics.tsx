import {createEffect} from 'solid-js'
import {useLocation, useParams} from '@solidjs/router'
import {computeRoute, inject, pageview} from '@vercel/analytics'

export function getBasePath(): string | undefined {
  // !! important !!
  // do not access env variables using import.meta.env[varname]
  // some bundles won't replace the value at build time.
  try {
    return import.meta.env.VITE_VERCEL_OBSERVABILITY_BASEPATH as string | undefined
  } catch {
    // do nothing
  }
}

const isAnalyticsEnabled = () => {
  return import.meta.env.VITE_ENABLE_ANALYTICS === 'true' || import.meta.env.VERCEL === '1'
}

export const Analytics = () => {
  if (!isAnalyticsEnabled()) {
    return null
  }

  const location = useLocation()
  const params = useParams()

  inject({
    basePath: getBasePath(),
    disableAutoTrack: true,
    framework: 'solid-start',
  })

  createEffect(() => {
    const {search} = location
    const connectChar = search.length > 0 ? '?' : ''

    pageview({
      path: `${location.pathname}${connectChar}${search}`,
      // this params use for log so it doesn't matter the type
      route: computeRoute(location.pathname, params as any),
    })
  })

  return null
}
