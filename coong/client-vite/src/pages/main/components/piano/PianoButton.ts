import {styled} from '@winter-love/uni'
import {PianoKeys, usePiano} from 'src/hooks/piano'
import {defineComponent, h, PropType, ref, toRef, watch} from 'vue'
import {getDataBooleanAttrs} from './get-data-boolean-attrs'
import {useGlobalPointDown} from './use-global-pointer-down'
import {useHoverTouchDown} from './use-hover-touch-down'
import {typeVariants} from './type-variants'

const onPointerupCapture = (event: PointerEvent) => {
  event.preventDefault()
}

export const HPianoButton = defineComponent({
  props: {
    pianoKey: {default: '1c', type: String as PropType<PianoKeys>},
  },
  setup: (props) => {
    const buttonRef = ref(null)
    const isGlobalPointDown = useGlobalPointDown()
    const pianoKey = toRef(props, 'pianoKey')
    const piano = usePiano(pianoKey.value)
    const isKeyDown = ref(false)
    // const isPlayed = ref(false)

    const isHoverDown = useHoverTouchDown(buttonRef, isGlobalPointDown)

    const downPlay = (event: MouseEvent & {sourceCapabilities: any}) => {
      if (event.sourceCapabilities.firesTouchEvents) {
        return
      }
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
      if (value) {
        piano.play()
      }
      // isPlayed.value = false
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
      })
  },
})

export const PianoButton = styled(
  HPianoButton,
  {
    '&[data-down]': {
      backgroundColor: 'blue',
    },
    backgroundColor: 'red',
    display: 'inline-block',
    flexShrink: 0,
    height: '100%',
    pointerEvents: 'auto',
    touchAction: 'none',
    width: '50px',
  },
  typeVariants,
)
