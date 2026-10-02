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
  return (
    <Show
      fallback={<RelaxPlayerPage returnHref="/?layout=all-in-one" />}
      when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}
    >
      <AppsInTossPrepare>
        <RelaxPlayerPage returnHref="/?layout=all-in-one" />
      </AppsInTossPrepare>
    </Show>
  )
}
