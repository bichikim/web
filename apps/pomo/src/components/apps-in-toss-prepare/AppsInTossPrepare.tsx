import {createSignal, onCleanup, onMount, type ParentProps, Show} from 'solid-js'

import {prepareAppsInTossLocale} from '../../features/apps-in-toss-locale'
import {AppsInTossLoadingPage} from '../apps-in-toss-loading-page/AppsInTossLoadingPage'

export const AppsInTossPrepare = (props: ParentProps) => {
  const [isReady, setIsReady] = createSignal(false)

  onMount(() => {
    let isActive = true

    onCleanup(() => {
      isActive = false
    })

    prepareAppsInTossLocale(() => isActive).then((result) => {
      if (result.status === 'prepared' && isActive) {
        setIsReady(true)
      }
    })
  })

  return (
    <Show fallback={<AppsInTossLoadingPage />} when={isReady()}>
      {props.children}
    </Show>
  )
}
