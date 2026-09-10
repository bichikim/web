import {useCurrentMatches, useLocation} from '@solidjs/router'
import {inject, pageview} from '@vercel/analytics'
import {createEffect, createMemo, on, onMount} from 'solid-js'

export const Analytics = () => {
  if (
    import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ||
    import.meta.env.VITE_POMO_IS_DESKTOP === 'true'
  ) {
    return null
  }

  const location = useLocation()
  const matches = useCurrentMatches()
  const route = createMemo(() => matches().at(-1)?.route.pattern || location.pathname)

  onMount(() => {
    inject({
      disableAutoTrack: true,
      framework: 'solid-start',
      mode: import.meta.env.DEV ? 'development' : 'production',
    })
    createEffect(
      on([() => location.pathname, route], ([path, pattern]) => {
        pageview({path, route: pattern})
      }),
    )
  })

  return null
}
