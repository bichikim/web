import {defineComponent, h, PropType} from 'vue'
import {UCard, UCardVariants} from 'src/components/card'
import {UDialog} from './UDialog'
import {DialogPosition} from './HDialog'

const indicatorBySide = (side: DialogPosition) => {
  switch (side) {
    case 'top': {
      return 'centerBottom'
    }
    case 'bottom': {
      return 'centerTop'
    }
    case 'left': {
      return 'endTop'
    }
    case 'right': {
      return 'startTop'
    }
  }
}

export const UDialogCard = defineComponent({
  name: 'UDialogCard',
  props: {
    bg: {type: String as PropType<UCardVariants['bg']>},
    for: null,
    indicator: {type: String as PropType<UCardVariants['indicator']>},
  },
  setup: (props, {slots}) => {
    return () =>
      h(
        UDialog,
        {for: props.for},
        {
          default: ({side}) => {
            const indicator =
              props.indicator ?? props.for ? indicatorBySide(side) : undefined
            return h(UCard, {bg: props.bg, indicator}, () => slots.default?.())
          },
        },
      )
  },
})
