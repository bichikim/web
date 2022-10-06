import {createAsElement, useSticky} from '@winter-love/use'
import {RelativePosition} from '@winter-love/utils'
import {computed, defineComponent, h, PropType, reactive, ref, Teleport, toRef} from 'vue'
import {provideControlDialog} from './use-dialog'

export type DialogPosition = 'left' | 'right' | 'top' | 'bottom'

export const HDialog = defineComponent({
  emits: {
    'update:modelValue': (value: boolean) => value || true,
  },
  inheritAttrs: false,
  name: 'HDialog',
  props: {
    as: {default: 'div', type: [String, Object, Function]},
    for: null,
    modelValue: {default: false, type: Boolean},
    position: {default: 'bottom', type: String as PropType<DialogPosition>},
    xPosition: {default: 'start', type: String as PropType<RelativePosition>},
    yPosition: {default: 'start', type: String as PropType<RelativePosition>},
  },
  setup: (props, {slots, attrs, emit}) => {
    const isOpenRef = toRef(props, 'modelValue')
    const positionRef = toRef(props, 'position')
    const elementRef = ref(null)
    const targetRef = toRef(props, 'for')
    const xPosition = toRef(props, 'xPosition')
    const yPosition = toRef(props, 'yPosition')

    const stickySizeRef = useSticky(
      elementRef,
      targetRef,
      reactive({defaultPosition: positionRef, xPosition, yPosition}),
    )
    const modalPositionRef = computed(() => {
      const {x, y, side} = stickySizeRef.value
      return {
        side,
        x,
        y,
      }
    })

    const handleOpen = (value: boolean) => {
      emit('update:modelValue', value)
    }

    const handleToggle = () => {
      handleOpen(!isOpenRef.value)
    }

    provideControlDialog(
      reactive({
        isOpen: isOpenRef,
        open: handleOpen,
        toggle: handleToggle,
      }),
    )

    return () =>
      h(Teleport, {to: 'body'}, [
        isOpenRef.value &&
          createAsElement(
            props.as,
            {
              ...attrs,
              ref: elementRef,
              style: {
                left: `${modalPositionRef.value.x}px`,
                top: `${modalPositionRef.value.y}px`,
              },
            },
            () =>
              slots.default?.({
                change: handleOpen,
                side: modalPositionRef.value.side,
                toggle: handleToggle,
              }),
          ),
      ])
  },
})
