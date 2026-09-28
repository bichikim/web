import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'
import {PHomePage} from 'src/components/p-home-page/PHomePage'

export default function RootPage() {
  return (
    <Show fallback={<PHomePage />} when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}>
      <AppsInTossPrepare>
        <PHomePage />
      </AppsInTossPrepare>
    </Show>
  )
}
