import {createSignal, onMount} from 'solid-js'

import type {PSceneStyle, PSceneStyleController} from './scene-style'
import {readPSceneStyle, writePSceneStyle} from './style-storage'

/** Owns the browser-only lifecycle for the persisted focus-room scene style. */
export const usePSceneStyle = (): PSceneStyleController => {
  const [sceneStyle, setSceneStyle] = createSignal<PSceneStyle>('original')
  const onSceneStyleChange = (nextSceneStyle: PSceneStyle) => {
    setSceneStyle(nextSceneStyle)
    writePSceneStyle(nextSceneStyle)
  }

  onMount(() => setSceneStyle(readPSceneStyle()))

  return {onSceneStyleChange, sceneStyle}
}
