import {styled} from '@winter-love/uni'
import {getWindow} from '@winter-love/utils'
import {PianoKeys, usePiano} from 'src/hooks/piano'
import {useEventDown} from 'src/hooks/use-event-down'
import {defineComponent, h, PropType, ref, toRef, watch} from 'vue'
import {dataBooleanAttrs} from 'src/pages/main/components/piano/data-boolean-attrs'
import {typeVariants} from './type-variants'
import {useEventHoverTouchDown} from 'src/hooks/use-event-hover-touch-down'
import {isNativePlatform} from 'src/utils/capacitor'

// disable touch event with capacitor environment
const _isNativePlatform = isNativePlatform()

const onPointerupCapture = (event: PointerEvent) => {
  event.preventDefault()
}

export const HPianoButton = defineComponent({
  name: 'PianoButton',
  props: {
    keyName: {type: String},
    pianoKey: {default: '1c', type: String as PropType<PianoKeys>},
    showKeyName: {type: Boolean},
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
      if (_isNativePlatform) {
        return
      }
      isKeyDown.value = true
      piano.play()
    }

    const hoverPlay = () => {
      if (_isNativePlatform) {
        return
      }
      if (isGlobalPointDown.value) {
        isKeyDown.value = true
        piano.play()
      }
    }

    const mouseout = () => {
      if (_isNativePlatform) {
        return
      }
      isKeyDown.value = false
      piano.muteSmoothly()
    }

    watch(isGlobalPointDown, (value) => {
      if (!value) {
        isKeyDown.value = false
        piano.muteSmoothly()
      }
    })

    watch(isHoverDown, (value) => {
      isKeyDown.value = value
      if (value) {
        piano.play()
        return
      }
      piano.muteSmoothly()
    })

    return () =>
      h(
        'button',
        {
          onMousedown: downPlay,
          onMouseout: mouseout,
          onMouseover: hoverPlay,
          onPointerupCapture,
          ref: buttonRef,
          title: `piano-key-${pianoKey.value}`,
        },
        h(
          'div',
          {
            ...dataBooleanAttrs({
              down: isKeyDown.value,
            }),
            class: 'key',
          },
          //
          h('span', {class: 'key-name'}, props.keyName),
        ),
      )
  },
})

export const PianoButton = styled(
  HPianoButton,
  {
    border: 'none',
    display: 'inline-flex',
    flexShrink: 0,
    height: '100%',
    m: 0,
    outline: 'none',
    p: 0,
    pointerEvents: 'auto',
    position: 'relative',
    touchAction: 'none',
  },
  {
    '& .key': {
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
      pointerEvents: 'none',
      position: 'relative',
      width: '100%',
    },
    '& .key-name': {
      bottom: 0,
      color: 'gray',
      fontWeight: 700,
      paddingBottom: 10,
      pointerEvents: 'none',
      position: 'absolute',
      width: '100%',
    },
  },
  typeVariants,
)
