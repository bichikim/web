import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossLoadingPage} from '../components/apps-in-toss-loading-page/AppsInTossLoadingPage'
import {PHomePage} from '../components/p-home-page/PHomePage'

const AppsInTossHomePage = clientOnly(
  async () => {
    const homeModule = await import('../components/apps-in-toss-home-page/AppsInTossHomePage')
    return {default: homeModule.AppsInTossHomePage}
  },
  {lazy: true},
)

export default function RootPage() {
  return (
    <Show fallback={<PHomePage />} when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}>
      <AppsInTossHomePage fallback={<AppsInTossLoadingPage />} />
    </Show>
  )
}
