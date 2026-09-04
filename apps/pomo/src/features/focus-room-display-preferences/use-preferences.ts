import {createSignal, onCleanup, onMount} from 'solid-js'

import {DEFAULT_P_DISPLAY_PREFERENCES, type PDisplayPreferencesController} from './model'
import {readPDisplayPreferences, writePDisplayPreferences} from './storage'

const persist = (dialogueComposerVisible: boolean) => {
  writePDisplayPreferences({dialogueComposerVisible}).catch(globalThis.reportError)
}

/** Owns the browser lifecycle for persisted focus-room display preferences. */
export const usePDisplayPreferences = (): PDisplayPreferencesController => {
  const [dialogueComposerVisible, setDialogueComposerVisible] = createSignal<boolean>(
    DEFAULT_P_DISPLAY_PREFERENCES.dialogueComposerVisible,
  )
  const [isReady, setIsReady] = createSignal(false)
  let visibilityRevision = 0

  const onDialogueComposerVisibleChange = (visible: boolean) => {
    visibilityRevision += 1
    setDialogueComposerVisible(visible)

    if (isReady()) {
      persist(visible)
    }
  }

  onMount(() => {
    let active = true
    const initialVisibilityRevision = visibilityRevision

    readPDisplayPreferences()
      .then((storedPreferences) => {
        if (active && visibilityRevision === initialVisibilityRevision) {
          setDialogueComposerVisible(storedPreferences.dialogueComposerVisible)
        }
      })
      .catch(globalThis.reportError)
      .finally(() => {
        if (!active) {
          return
        }

        const changedDuringRestore = visibilityRevision !== initialVisibilityRevision
        setIsReady(true)

        if (changedDuringRestore) {
          persist(dialogueComposerVisible())
        }
      })

    onCleanup(() => {
      active = false
    })
  })

  return {
    dialogueComposerVisible,
    isReady,
    onDialogueComposerVisibleChange,
  }
}
