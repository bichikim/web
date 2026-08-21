import {createSignal, onCleanup, onMount} from 'solid-js'

import {getDefaultPSceneStyle, type PSceneStyle, type PSceneStyleController} from './scene-style'
import {readPSceneStyle, writePSceneStyle} from './style-storage'

/** Owns the browser-only lifecycle for the persisted focus-room scene style. */
export const usePSceneStyle = (): PSceneStyleController => {
  const [sceneStyle, setSceneStyle] = createSignal<PSceneStyle>(getDefaultPSceneStyle())
  const [isReady, setIsReady] = createSignal(false)
  let changeRevision = 0
  const onSceneStyleChange = (nextSceneStyle: PSceneStyle) => {
    changeRevision += 1
    setSceneStyle(nextSceneStyle)
    setIsReady(true)
    writePSceneStyle(nextSceneStyle).catch(globalThis.reportError)
  }

  onMount(() => {
    let active = true
    const initialChangeRevision = changeRevision

    readPSceneStyle()
      .then((storedSceneStyle) => {
        if (active && changeRevision === initialChangeRevision) {
          setSceneStyle(storedSceneStyle)
        }
      })
      .catch(globalThis.reportError)
      .finally(() => {
        if (active) {
          setIsReady(true)
        }
      })

    onCleanup(() => {
      active = false
    })
  })

  return {isReady, onSceneStyleChange, sceneStyle}
}
