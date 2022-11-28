import {useEvent} from '@winter-love/use'
import {createOnce} from '@winter-love/utils'
import {DeepReadonly, effectScope, readonly, Ref, shallowRef} from 'vue'

const DEFAULT_UPDATE = (event) => event

export const createGlobalEvent = (
  eventName: keyof WindowEventMap,
  update: (event: any) => any = DEFAULT_UPDATE,
) => {
  return createOnce(() => {
    const scope = effectScope()
    return scope.run((): DeepReadonly<Ref<null | TouchList>> => {
      const eventRef = shallowRef(null)

      const _update = (event: any) => {
        eventRef.value = update(event)
      }

      useEvent(document.body as any, eventName, _update, true, {
        passive: false,
      })

      return readonly(eventRef)
    })
  })
}
