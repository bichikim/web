import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'

const RelaxPlayerPage = clientOnly(
  async () => {
    const {PRelaxPlayerPage} = await import('src/components/p-relax-player-page/PRelaxPlayerPage')
    return {default: PRelaxPlayerPage}
  },
  {lazy: true},
)

export default function RelaxPage() {
  // /relax is also a dedicated-build alias: only the integrated Pomo build has
  // an app to return to. Missing returnHref in a player build is intentional.
  const returnHref =
    import.meta.env.VITE_POMO_STANDALONE_RELAX === 'true' ||
    import.meta.env.VITE_APP_LAYOUT === 'relax-player'
      ? undefined
      : '/?layout=all-in-one'

  return (
    <Show
      fallback={<RelaxPlayerPage returnHref={returnHref} />}
      when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}
    >
      <AppsInTossPrepare>
        <RelaxPlayerPage returnHref={returnHref} />
      </AppsInTossPrepare>
    </Show>
  )
}
