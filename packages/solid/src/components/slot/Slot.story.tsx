import {children, createSignal, onCleanup, onMount, JSXElement} from 'solid-js'
import type {JSX} from 'solid-js/types/jsx'
import {getSlots} from './use-slots'
import {Slot} from './Slot'

export interface SlotParentProps {
  children?: JSXElement
}

const SlotComponent = (props: SlotParentProps) => {
  const slots = getSlots(props.children)
  const [headCount, setHeadCount] = createSignal(0)
  const [bodyCount, setBodyCount] = createSignal(0)
  return <div>
    {slots.head}
    {slots.default}
  </div>
}

const meta = {
  component: SlotComponent,
}

export default meta

export const Default = {
  render: () => <SlotComponent>
    body
    <Slot name="head">
      head
    </Slot>
  </SlotComponent>,
}
