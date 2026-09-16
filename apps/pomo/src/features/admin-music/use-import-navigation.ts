import {type BeforeLeaveEventArgs, useBeforeLeave} from '@solidjs/router'
import {type Accessor, createSignal} from 'solid-js'

export const useImportNavigation = (isImporting: Accessor<boolean>) => {
  const [pending, setPending] = createSignal<BeforeLeaveEventArgs | null>(null)
  useBeforeLeave((event) => {
    if (isImporting()) {
      event.preventDefault()
      setPending(event)
    }
  })
  const confirmLeave = (): void => {
    const navigation = pending()
    setPending(null)
    navigation?.retry(true)
  }
  return {
    cancelLeave: () => setPending(null),
    confirmLeave,
    isLeaveRequested: () => pending() !== null,
  }
}
