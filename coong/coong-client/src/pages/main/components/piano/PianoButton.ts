import {getWindow} from '@winter-love/utils'
import {cva, VariantProps} from 'class-variance-authority'
import {PianoKeys, usePiano} from 'src/hooks/piano'
import {useEventDown} from 'src/hooks/use-event-down'
import {useEventHoverTouchDown} from 'src/hooks/use-event-hover-touch-down'
import {isNativePlatform} from 'src/utils/capacitor'
import {defineComponent, h, PropType, ref, toRef, watch} from 'vue'

// disable touch event with capacitor environment
const _isNativePlatform = isNativePlatform()

const buttonStyle = cva(
  [
    'b-none inline-flex flex-shrink-0 h-full m-0 outline-0',
    'p-0 pointer-events-auto relative touch-none',
  ],
  {
    variants: {
      type: {
        flat: 'w-80px bg-gradient-[-30deg,#f5f5f5,#fff]] bg-gradient-linear',
        sharp: 'w-50px mr-30px',
      },
    },
  },
)

const keyStyle = cva(
  [
    'b-solid b-#ccc rd-t-0 inline-flex flex-shrink-0 h-full overflow-hidden',
    'p-0 pointer-events-none relative w-full',
  ],
  {
    compoundVariants: [
      //
      {
        class: [
          //
          'shadow-[0 2px 2px rgb(0 0 0 / 40%)] scale-x-100 scale-y-99 origin-top',
          'after:content-[""] after:bg-black after:h-full after:left--2.5px after:opacity-10 after:absolute',
          'after:top-0 after:skew-x-0.5 after:w-5px',
          'before:content-[""] before:bg-black before:h-full before:right--2.5px before:opacity-10 before:absolute',
          'before:top-0 before:skew-x--0.5 before:w-5px',
        ],
        down: true,
        type: 'flat',
      },
      {
        class: [
          //
          'b-b-2px shadow-sharp-down-key',
        ],
        down: true,
        type: 'sharp',
      },
    ],
    variants: {
      down: {
        true: '',
      },
      type: {
        flat: [
          //
          'rd-b-3px b-1px shadow-flat-key',
        ],
        sharp: [
          //
          'b-x-2px b-t-1px b-b-10px rd-b-2px shadow-sharp-key',
          'bg-gradient-linear bg-gradient-[-20deg,#333,#000,#333] bg-black',
          'b-t-#666 b-r-#222 b-b-#111 b-l-#555',
        ],
      },
    },
  },
)

const keyNameStyle = cva(
  ['bottom-0 c-gray font-weight-700 pb-10px pointer-events-none absolute w-full'],
  {
    variants: {
      type: {
        flat: 'c-gray',
        sharp: 'c-white',
      },
    },
  },
)

type ButtonStylePropsType = VariantProps<typeof buttonStyle>

const onPointerupCapture = (event: PointerEvent) => {
  event.preventDefault()
}

export const HPianoButton = defineComponent({
  name: 'PianoButton',
  props: {
    keyName: {type: String},
    pianoKey: {default: '1c', type: String as PropType<PianoKeys>},
    showKeyName: {type: Boolean},
    type: {default: 'flat', type: String as PropType<ButtonStylePropsType['type']>},
  },
  setup: (props) => {
    const buttonRef: any = ref(null)
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
      piano.down()
    }

    const hoverPlay = () => {
      if (_isNativePlatform) {
        return
      }
      if (isGlobalPointDown.value) {
        isKeyDown.value = true
        piano.down()
      }
    }

    const mouseout = () => {
      if (_isNativePlatform) {
        return
      }
      isKeyDown.value = false
      piano.up()
    }

    watch(isGlobalPointDown, (value) => {
      if (!value) {
        isKeyDown.value = false
        piano.up()
      }
    })

    watch(isHoverDown, (value) => {
      isKeyDown.value = value
      if (value) {
        piano.down()
        return
      }
      piano.up()
    })

    return () =>
      h(
        'button',
        {
          class: buttonStyle({type: props.type}),
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
            class: keyStyle({down: isKeyDown.value, type: props.type}),
          },
          //
          h('span', {class: keyNameStyle({type: props.type})}, props.keyName),
        ),
      )
  },
})
