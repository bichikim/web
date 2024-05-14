import {JSXElement} from 'solid-js'
import {Slot} from './Slot'
import {getSlots} from './use-slots'

export interface SlotParentProps {
  children?: JSXElement
}

const SlotComponent = (props: SlotParentProps) => {
  const slots = getSlots(props.children)
  return (
    <div>
      {slots.head}
      {slots.default}
    </div>
  )
}

const meta = {
  component: SlotComponent,
}

export default meta

export const Default = {
  render: () => (
    <SlotComponent>
      body
      <Slot name="head">head</Slot>
    </SlotComponent>
  ),
}
