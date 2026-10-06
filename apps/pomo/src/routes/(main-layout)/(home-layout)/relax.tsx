import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'

const SlowcovePage = clientOnly(
  async () => {
    const {PSlowcovePage} = await import('src/components/p-slowcove-page/PSlowcovePage')
    return {default: PSlowcovePage}
  },
  {lazy: true},
)

export default function RelaxPage() {
  // /relax is also a dedicated-build alias: only the integrated Pomo build has
  // an app to return to. Missing returnHref in a player build is intentional.
  const returnHref =
    import.meta.env.VITE_POMO_STANDALONE_RELAX === 'true' ||
    import.meta.env.VITE_APP_LAYOUT === 'slowcove'
      ? undefined
      : '/?layout=all-in-one'

  return (
    <Show
      fallback={<SlowcovePage returnHref={returnHref} />}
      when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}
    >
      <AppsInTossPrepare>
        <SlowcovePage returnHref={returnHref} />
      </AppsInTossPrepare>
    </Show>
  )
}
