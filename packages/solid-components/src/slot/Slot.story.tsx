import {JSXElement} from 'solid-js'
import {Slot} from './Slot'
import {useSlots} from './use-slots'

export interface SlotParentProps {
  children?: JSXElement
}

const SlotComponent = (props: SlotParentProps) => {
  const slots = useSlots(props.children)

  return (
    <div>
      {slots.head}
      {slots.default}
    </div>
  )
}

const meta = {
  component: SlotComponent,
  title: 'Solid/components/Slot',
}

export default meta

export const Default = {
  render: () => (
    <SlotComponent>
      body
      {/* The order is rendered in reverse as defined in SlotComponent */}
      <Slot name="head">head</Slot>
    </SlotComponent>
  ),
}
