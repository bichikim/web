import {useSearchParams} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {Show} from 'solid-js'

import {AppsInTossPrepare} from 'src/components/apps-in-toss-prepare'
import {PHomePage} from 'src/components/p-home-page/PHomePage'

const SlowcovePage = clientOnly(
  async () => {
    const {PSlowcovePage} = await import('src/components/p-slowcove-page/PSlowcovePage')
    return {default: PSlowcovePage}
  },
  {lazy: true},
)

const isAllInOneLayout = (layout: string | string[] | undefined) =>
  layout === 'all-in-one' || (Array.isArray(layout) && layout.includes('all-in-one'))

export default function RootPage() {
  const [searchParams] = useSearchParams()
  // Dedicated player builds intentionally omit returnHref; returning to Pomo belongs
  // to its integrated /relax entry, not this separately published player.
  return (
    <>
      {import.meta.env.VITE_POMO_STANDALONE_RELAX === 'true' ? (
        <SlowcovePage />
      ) : (
        <Show
          fallback={
            <Show
              fallback={<PHomePage />}
              when={
                import.meta.env.VITE_APP_LAYOUT === 'slowcove' &&
                !isAllInOneLayout(searchParams.layout)
              }
            >
              <SlowcovePage />
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
