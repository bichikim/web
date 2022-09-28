interface SwitchProps {
  is: boolean
}

const Switch: FC<SwitchProps> = (props, {slots}) => {
  return props.is ? slots.default?.() : slots.else?.() ?? null
}

Switch.props = {
  is: {type: Boolean},
}

const IndexPage = defineComponent({
  name: 'IndexPage',
  setup: () => {
    return () => null
  },
})

export default IndexPage
