import {onEvent} from '@winter-love/use'
import {once} from '@winter-love/utils'
import {DeepReadonly, effectScope, readonly, Ref, shallowRef} from 'vue'

const DEFAULT_UPDATE = <T>(event: T) => event

export const createGlobalEvent = <T>(
  eventName: keyof WindowEventMap,
  update: (event: T) => any = DEFAULT_UPDATE,
) => {
  return once(() => {
    const scope = effectScope()
    return scope.run((): DeepReadonly<Ref<null | TouchList>> => {
      const eventRef = shallowRef(null)

      const _update = (event: any) => {
        eventRef.value = update(event)
      }

      onEvent(document.body as any, eventName, _update, {
        passive: false,
      })

      return readonly(eventRef)
    }) as DeepReadonly<Ref<TouchList | null>>
  })
}
