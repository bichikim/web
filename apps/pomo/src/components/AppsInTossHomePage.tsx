import {createSignal, onCleanup, onMount, Show} from 'solid-js'

import {getInitialAppsInTossLocale} from '../features/apps-in-toss-locale/bootstrap'
import {reportClientError} from '../features/client-error-reporter'
import {getTextDirection, setLocale} from '@paraglide/runtime'
import {PHomePage} from './PHomePage'
import {AppsInTossLoadingPage} from './AppsInTossLoadingPage'

export const AppsInTossHomePage = () => {
  const [isReady, setIsReady] = createSignal(false)

  onMount(() => {
    let isActive = true

    onCleanup(() => {
      isActive = false
    })

    getInitialAppsInTossLocale()
      .then(async (locale) => {
        if (!isActive) {
          return
        }

        await setLocale(locale, {reload: false})

        if (!isActive) {
          return
        }

        document.documentElement.lang = locale
        document.documentElement.dir = getTextDirection(locale)
      })
      .catch((error: unknown) => {
        reportClientError(error, {feature: 'apps-in-toss-locale', source: 'direct'})
      })
      .finally(() => {
        if (isActive) {
          setIsReady(true)
        }
      })
  })

  return (
    <Show fallback={<AppsInTossLoadingPage />} when={isReady()}>
      <PHomePage />
    </Show>
  )
}
