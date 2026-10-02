import {useSearchParams} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'
import {PHomePage} from 'src/components/p-home-page/PHomePage'
import {RELAX_FULL_APP_HREF} from 'src/features/relax-player'

const RelaxPlayerPage = clientOnly(
  async () => {
    const {PRelaxPlayerPage} = await import('src/components/p-relax-player-page/PRelaxPlayerPage')
    return {default: PRelaxPlayerPage}
  },
  {lazy: true},
)

export default function RootPage() {
  const [searchParams] = useSearchParams()
  return (
    <>
      {import.meta.env.VITE_POMO_STANDALONE_RELAX === 'true' ? (
        <RelaxPlayerPage returnHref={RELAX_FULL_APP_HREF} />
      ) : (
        <Show
          fallback={
            <Show
              fallback={<PHomePage />}
              when={
                import.meta.env.VITE_APP_LAYOUT === 'relax-player' &&
                searchParams.layout !== 'all-in-one'
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
      )}
    </>
  )
}
