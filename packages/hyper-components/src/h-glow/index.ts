import {useCsx} from 'src/index'
import {defineComponent, h} from 'vue-demi'
import {HBox} from '../h-box'

const style = {
  '&>*': {
    position: 'relative',
    zIndex: 0,
  },
  '&>*:before': {
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
  '&>*:hover::before': {
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
  props: {
    css: null,
  },
  setup: (props, {slots}) => {
    const csx = useCsx()
    return () => {
      const {class: className} = csx({css: style})
      return h(HBox, {...props, class: className}, slots)
    }
  },
})
