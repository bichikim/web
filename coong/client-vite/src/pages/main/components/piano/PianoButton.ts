import {styled} from '@winter-love/uni'
import {PianoKeys, usePiano} from 'src/hooks/piano'
import {defineComponent, h, PropType, ref, toRef, watch} from 'vue'
import {getDataBooleanAttrs} from './get-data-boolean-attrs'
import {useGlobalPointDown} from './use-global-pointer-down'
import {useHoverTouchDown} from './use-hover-touch-down'

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

    const onMouseout = () => {
      isKeyDown.value = false
    }

    const hoverPlay = () => {
      if (isGlobalPointDown.value) {
        isKeyDown.value = true
        piano.play()
      }
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
      // isPlayed.value = false
    })

    return () =>
      h('button', {
        ...getDataBooleanAttrs({
          down: isKeyDown.value,
        }),
        onMousedown: downPlay,
        onMouseout,
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
    height: '100%',
    touchAction: 'none',
    width: '50px',
  },
  {
    variants: {
      type: {
        flat: {
          width: '50px',
        },
        sharp: {
          width: '30px',
        },
      },
    },
  },
)
