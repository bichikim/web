import {defineComponent, h} from 'vue'
import UilArrowsH from '~icons/uil/arrows-h'

export const HScrollAbleSign = defineComponent(() => {
  return () =>
    h('div', {class: 'w-auto'}, [
      //
      h('div', {class: 'flex items-center'}, [
        //
        h(
          'span',
          {class: 'text-1rem font-bold text-gray-500'},
          'scroll left or right to see more octaves',
        ),
        h(UilArrowsH, {class: 'text-1.4rem mt-0.25 text-gray-500'}),
      ]),
    ])
})
