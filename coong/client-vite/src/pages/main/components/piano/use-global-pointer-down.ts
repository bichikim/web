import {useEvent} from '@winter-love/use'
import {computed, effectScope, Ref, ref} from 'vue'
import {createOnce, getDocument, getWindow} from '@winter-love/utils'

const scope = effectScope()

let mousedown: Ref<boolean>

const initEvent = createOnce(() => {
  mousedown = scope.run(() => {
    const mousedown = ref(false)
    const thisDocument = getDocument()

    useEvent(getWindow(), 'pointerdown', () => {
      mousedown.value = true
    })

    useEvent(getWindow(), 'pointerup', () => {
      mousedown.value = false
    })

    useEvent(getDocument(), 'visibilitychange', (event) => {
      if (event.target !== thisDocument) {
        mousedown.value = false
      }
    })

    return mousedown
  })
})

export const useGlobalPointDown = () => {
  initEvent()
  return computed(() => mousedown.value)
}
