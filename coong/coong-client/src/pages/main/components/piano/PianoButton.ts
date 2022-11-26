import {styled} from '@winter-love/uni'
import {getWindow} from '@winter-love/utils'
import {PianoKeys, usePiano} from 'src/hooks/piano'
import {useEventDown} from 'src/hooks/use-event-down'
import {defineComponent, h, PropType, ref, toRef, watch} from 'vue'
import {getDataBooleanAttrs} from './get-data-boolean-attrs'
import {typeVariants} from './type-variants'
import {useEventHoverTouchDown} from 'src/hooks/use-event-hover-touch-down'

const onPointerupCapture = (event: PointerEvent) => {
  event.preventDefault()
}

export const HPianoButton = defineComponent({
  name: 'PianoButton',
  props: {
    pianoKey: {default: '1c', type: String as PropType<PianoKeys>},
  },
  setup: (props) => {
    const buttonRef = ref(null)
    const isGlobalPointDown = useEventDown(getWindow(), {
      down: 'mousedown',
      up: 'mouseup',
    })
    const pianoKey = toRef(props, 'pianoKey')
    const piano = usePiano(pianoKey.value)
    const isKeyDown = ref(false)

    const isHoverDown = useEventHoverTouchDown(buttonRef)

    const downPlay = () => {
      isKeyDown.value = true
      piano.play()
    }

    const hoverPlay = () => {
      if (isGlobalPointDown.value) {
        isKeyDown.value = true
        piano.play()
      }
    }

    const mouseout = () => {
      isKeyDown.value = false
    }

    watch(isGlobalPointDown, (value) => {
      if (!value) {
        isKeyDown.value = false
      }
    })

    watch(isHoverDown, (value) => {
      isKeyDown.value = value
      if (value) {
        piano.play()
      }
    })

    return () =>
      h('button', {
        ...getDataBooleanAttrs({
          down: isKeyDown.value,
        }),
        onMousedown: downPlay,
        onMouseout: mouseout,
        onMouseover: hoverPlay,
        onPointerupCapture,
        ref: buttonRef,
        title: `piano-key-${pianoKey.value}`,
      })
  },
})

export const PianoButton = styled(
  HPianoButton,
  {
    border: '1px solid #ccc',
    borderRadius: '0 0 3px 3px',
    boxShadow:
      'inset 0 1px 0px #fff, inset 0 -1px 0px #fff, inset 1px 0px 0px #fff,' +
      ' inset -1px 0px 0px #fff, 0 4px 3px rgb(0 0 0 / 70%)',
    display: 'inline-flex',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    p: 0,
    pointerEvents: 'auto',
    position: 'relative',
    touchAction: 'none',
    width: '50px',
  },
  typeVariants,
)
