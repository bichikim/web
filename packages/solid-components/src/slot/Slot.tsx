import {JSXElement, mergeProps} from 'solid-js'

export const SLOT_KEY = '__slot__'

export interface SlotProps {
  children: JSXElement
  name: string
}

/**
 * Interface representing the structure for marking a slot.
 * This extends the SlotProps interface and adds a special key to identify it as a slot.
 */
export interface SlotContext extends SlotProps {
  [SLOT_KEY]?: true
}

/**
 * A component that defines a named slot for content projection.
 * In most cases, Slot is not necessary. Only use it if you know exactly how it works.
 *
 * @component
 * @example
 * ```tsx
 * <Slot name="header">
 *   <h1>Header Content</h1>
 * </Slot>
 * ```
 *
 * @param {SlotProps} props - The properties for the Slot component.
 * @param {JSXElement} props.children - The content to be projected into the slot.
 * @param {string} props.name - The name of the slot for identification.
 *
 * @returns {JSXElement} A JSX element representing the slot.
 */
export const Slot = (props: SlotProps) => {
  return mergeProps({[SLOT_KEY]: true}, props) as unknown as JSXElement
}
