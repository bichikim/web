import {createVueStitches} from '../'
import {mount} from '@winter-love/vue-test'

beforeEach(() => {
  document.body.innerHTML = `
  <div>
    <div id="app"></div>
  </div>
`
})

describe('createStitches', () => {
  it('should style elements', () => {
    const stitches = createVueStitches()

    const Component = stitches.styled('div', {
      color: 'red',
    })

    const wrapper = mount(Component)

    document.querySelector('#app').append(wrapper.element)

    expect(window.getComputedStyle(wrapper.element).color).toBe('rgb(255, 0, 0)')
  })
})
