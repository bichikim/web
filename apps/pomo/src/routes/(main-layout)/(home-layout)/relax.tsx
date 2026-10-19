import {SLOWCOVE_RETURN_HREF, SlowcovePage} from 'src/components/p-slowcove-page/SlowcovePage'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'

export default function RelaxPage() {
  // /relax is also a dedicated-build alias: only the integrated Pomo build has
  // an app to return to. Missing returnHref in a player build is intentional.
  const returnHref =
    import.meta.env.VITE_POMO_STANDALONE_RELAX === 'true' ||
    import.meta.env.VITE_APP_LAYOUT === 'slowcove'
      ? undefined
      : SLOWCOVE_RETURN_HREF

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
