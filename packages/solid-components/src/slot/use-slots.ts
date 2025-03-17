import {children, createComputed, JSXElement, on} from 'solid-js'
import {createStore} from 'solid-js/store'
import {SLOT_KEY, SlotContext} from '../slot/Slot'

/**
 * A hook for using slots.
 * This hook analyzes child elements and categorizes them into named slots and a default slot.
 *
 * @param {JSXElement} _children - The child elements to analyze
 * @returns {Record<string, JSXElement>} An object of slots categorized by name
 *
 * @example
 * ```tsx
 * const Component = (props: { children?: JSXElement }) => {
 *   const slots = useSlots(props.children);
 *
 *   return (
 *     <div>
 *       {slots.header}
 *       <main>{slots.default}</main>
 *       {slots.footer}
 *     </div>
 *   );
 * }
 *
 * // Usage example
 * <Component>
 *   Default content
 *   <Slot name="header">Header content</Slot>
 *   <Slot name="footer">Footer content</Slot>
 * </Component>
 * ```
 */
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
