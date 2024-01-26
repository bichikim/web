import {scrollIntoView} from '../'
import {h, ref} from 'vue'
import {describe, it, expect} from 'vitest'
export default {
  title: 'utils/scrollIntoView',
}

export const Default = () => ({
  setup() {
    const element = ref()

    const scroll = () => {
      scrollIntoView(element.value, {behavior: 'smooth'})
    }

    return () =>
      h('div', {}, [
        h('button', {onClick: scroll}, 'view'),
        h(
          'div',
          {style: {display: 'flex', height: '100px', overflow: 'auto', width: '300px'}},
          [
            //
            h(
              'div',
              {
                style: {
                  backgroundColor: 'red',
                  flexShrink: 0,
                  height: '100px',
                  width: '3000px',
                },
              },
              'target',
            ),
            h(
              'div',
              {
                ref: element,
                style: {
                  backgroundColor: 'green',
                  flexShrink: 0,
                  height: '100px',
                  width: '200px',
                },
              },
              'target',
            ),
          ],
        ),
      ])
  },
})
