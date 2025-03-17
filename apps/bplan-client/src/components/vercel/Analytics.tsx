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

export const Analytics = () => {
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
      route: computeRoute(location.pathname, params),
    })
  })

  return null
}
