import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'
import {PHomePage} from 'src/components/p-home-page/PHomePage'

const RelaxPlayerPage = clientOnly(
  async () => {
    const {PRelaxPlayerPage} = await import('src/components/p-relax-player-page/PRelaxPlayerPage')
    return {default: PRelaxPlayerPage}
  },
  {lazy: true},
)

export default function RootPage() {
  return (
    <Show
      fallback={
        <Show fallback={<PHomePage />} when={import.meta.env.VITE_APP_LAYOUT === 'relax-player'}>
          <RelaxPlayerPage />
        </Show>
      }
      when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}
    >
      <AppsInTossPrepare>
        <PHomePage />
      </AppsInTossPrepare>
    </Show>
  )
}
