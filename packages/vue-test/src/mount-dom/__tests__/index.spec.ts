/**
 * @jest-environment jsdom
 */

import {mountDom} from '../'
import {defineComponent, h} from 'vue'

describe('mountDom', () => {
  it('should append mounted element', () => {
    const wrapper = mountDom(
      defineComponent({
        setup() {
          return () => {
            return h('div', 'hello app')
          }
        },
      }),
    )

    expect(document.querySelector('#app')).toHaveTextContent('hello app')
  })
})
