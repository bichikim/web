import {createSignal, onCleanup, onMount} from 'solid-js'

import {DEFAULT_P_DISPLAY_PREFERENCES, type PDisplayPreferencesController} from './model'
import {readPDisplayPreferences, writePDisplayPreferences} from './storage'

/** Owns the browser lifecycle for persisted focus-room display preferences. */
export const usePDisplayPreferences = (): PDisplayPreferencesController => {
  const [dialogueComposerVisible, setDialogueComposerVisible] = createSignal<boolean>(
    DEFAULT_P_DISPLAY_PREFERENCES.dialogueComposerVisible,
  )
  const [tourButtonVisible, setTourButtonVisible] = createSignal<boolean>(true)
  const [toolsButtonVisible, setToolsButtonVisible] = createSignal(true)
  let toolsRevision = 0
  const [memoryAssistVisible, setMemoryAssistVisible] = createSignal(true)
  let memoryRevision = 0
  let tourRevision = 0
  const persist = () => {
    writePDisplayPreferences({
      dialogueComposerVisible: dialogueComposerVisible(),
      memoryAssistVisible: memoryAssistVisible(),
      toolsButtonVisible: toolsButtonVisible(),
      tourButtonVisible: tourButtonVisible(),
    }).catch(globalThis.reportError)
  }
  const onTourButtonVisibleChange = (visible: boolean) => {
    tourRevision += 1
    setTourButtonVisible(visible)
    if (isReady()) {
      persist()
    }
  }
  const onToolsButtonVisibleChange = (visible: boolean) => {
    toolsRevision += 1
    setToolsButtonVisible(visible)
    if (isReady()) {
      persist()
    }
  }
  const onMemoryAssistVisibleChange = (visible: boolean) => {
    memoryRevision += 1
    setMemoryAssistVisible(visible)
    if (isReady()) {
      persist()
    }
  }
  const [isReady, setIsReady] = createSignal(false)
  let visibilityRevision = 0

  const onDialogueComposerVisibleChange = (visible: boolean) => {
    visibilityRevision += 1
    setDialogueComposerVisible(visible)

    if (isReady()) {
      persist()
    }
  }

  onMount(() => {
    let active = true
    const initialToolsRevision = toolsRevision
    const initialMemoryRevision = memoryRevision
    const initialTourRevision = tourRevision
    const initialVisibilityRevision = visibilityRevision

    readPDisplayPreferences()
      .then((storedPreferences) => {
        if (active && toolsRevision === initialToolsRevision) {
          setToolsButtonVisible(storedPreferences.toolsButtonVisible)
        }
        if (active && memoryRevision === initialMemoryRevision) {
          setMemoryAssistVisible(storedPreferences.memoryAssistVisible)
        }
        if (active && tourRevision === initialTourRevision) {
          setTourButtonVisible(storedPreferences.tourButtonVisible)
        }
        if (active && visibilityRevision === initialVisibilityRevision) {
          setDialogueComposerVisible(storedPreferences.dialogueComposerVisible)
        }
      })
      .catch(globalThis.reportError)
      .finally(() => {
        if (!active) {
          return
        }

        const changedDuringRestore =
          toolsRevision !== initialToolsRevision ||
          memoryRevision !== initialMemoryRevision ||
          visibilityRevision !== initialVisibilityRevision ||
          tourRevision !== initialTourRevision
        setIsReady(true)

        if (changedDuringRestore) {
          persist()
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
    onToolsButtonVisibleChange,
    onTourButtonVisibleChange,
    memoryAssistVisible,
    toolsButtonVisible,
    onMemoryAssistVisibleChange,
    tourButtonVisible,
  }
}
