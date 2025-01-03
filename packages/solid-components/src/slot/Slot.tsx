import {JSXElement, mergeProps} from 'solid-js'

export const SLOT_KEY = '__slot__'
export interface SlotProps {
  children: JSXElement
  name: string
}

export interface SlotContext extends SlotProps {
  [SLOT_KEY]?: true
}

export const Slot = (props: SlotProps) => {
  return mergeProps({[SLOT_KEY]: true}, props) as unknown as JSXElement
}
