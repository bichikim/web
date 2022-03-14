import clsx from 'clsx'
import {useSystem} from '../'
import {defineComponent} from 'vue-demi'

const style = {
  '&': {
    position: 'relative',
    zIndex: 0,
  },
  '&:before': {
    background: 'inherit',
    backgroundColor: 'inherit',
    backgroundSize: 'inherit',
    borderRadius: 'inherit',
    bottom: '-5px',
    content: '',
    filter: 'blur(10px)',
    left: '-5px',
    opacity: 0.6,
    position: 'absolute',
    right: '-5px',
    top: '-5px',
    transition: '0.5s !important',
    zIndex: -1,
  },
  '&:hover::before': {
    animation: 'animate 8s linear infinite',
    bottom: '-5px',
    filter: 'blur(13px)',
    left: '-5px',
    opacity: '1',
    right: '-5px',
    top: '-5px',
  },
}

export const HGlow = defineComponent({
  name: 'HGlow',
  render() {
    const {$slots} = this
    const nodes = $slots.default?.()
    const system = useSystem()

    return nodes ? nodes.map((node) => {
      const props = node?.props

      if (!props) {
        return node
      }

      Object.assign(props, {class: clsx(props.class, system({css: style}).className)})

      return node
    }) : nodes
  },
})
