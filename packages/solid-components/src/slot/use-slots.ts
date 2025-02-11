import {children, createComputed, JSXElement, on} from 'solid-js'
import {createStore} from 'solid-js/store'
import {SLOT_KEY, SlotContext} from '../slot/Slot'

export const useSlots = (_children: JSXElement) => {
  const parts = children(() => _children)
  const [slots, setSlots] = createStore<Record<string, JSXElement>>({})

  createComputed(
    on(parts, () => {
      for (const part of parts.toArray() as unknown as SlotContext[]) {
        if (part[SLOT_KEY]) {
          setSlots(part.name, () => part.children)
        } else {
          setSlots('default', () => part as unknown as JSXElement)
        }
      }
    }),
  )

  return slots
}
