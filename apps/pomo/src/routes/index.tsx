import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossLoadingPage} from '../components/AppsInTossLoadingPage'
import {PHomePage} from '../components/PHomePage'

const AppsInTossHomePage = clientOnly(
  async () => {
    const homeModule = await import('../components/AppsInTossHomePage')
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
