import {useSearchParams} from '@solidjs/router'
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

const isAllInOneLayout = (layout: string | string[] | undefined) =>
  layout === 'all-in-one' || (Array.isArray(layout) && layout.includes('all-in-one'))

export default function RootPage() {
  const [searchParams] = useSearchParams()
  return (
    <Show
      fallback={
        <Show
          fallback={<PHomePage />}
          when={
            import.meta.env.VITE_APP_LAYOUT === 'relax-player' &&
            !isAllInOneLayout(searchParams.layout)
          }
        >
          <RelaxPlayerPage returnHref="/?layout=all-in-one" />
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
