import {
  ALL_IN_ONE_LAYOUT,
  RelaxPlayerPage,
} from 'src/components/p-relax-player-page/ClientRelaxPlayerPage'
import {useSearchParams} from '@solidjs/router'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'
import {PHomePage} from 'src/components/p-home-page/PHomePage'

const isAllInOneLayout = (layout: string | string[] | undefined) =>
  layout === ALL_IN_ONE_LAYOUT || (Array.isArray(layout) && layout.includes(ALL_IN_ONE_LAYOUT))

export default function RootPage() {
  const [searchParams] = useSearchParams()
  // Dedicated player builds intentionally omit returnHref; returning to Pomo belongs
  // to its integrated /relax entry, not this separately published player.
  return (
    <>
      {import.meta.env.VITE_POMO_STANDALONE_RELAX === 'true' ? (
        <RelaxPlayerPage />
      ) : (
        <Show
          fallback={
            <Show
              fallback={<PHomePage />}
              when={
                import.meta.env.VITE_APP_LAYOUT === 'relax-player' &&
                !isAllInOneLayout(searchParams.layout)
              }
            >
              <RelaxPlayerPage />
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
