import {expect} from '@storybook/jest'
import {within} from '@storybook/testing-library'
import {StoryFn} from '@storybook/vue3'
import {createVueStitches} from 'src/create-stitches'
import {h} from 'vue'

export default {
  title: 'stiches/create-stitches',
}

const stitches = createVueStitches({})

const ColoredComponent = stitches.styled('div', {
  color: 'red',
})

export const Default: StoryFn<typeof ColoredComponent> = () => ({
  render() {
    return h(ColoredComponent, {}, () => 'hello')
  },
})

Default.play = async ({canvasElement}) => {
  const canvas = within(canvasElement)

  expect(canvas.getByText('hello')).toHaveStyle({
    color: 'rgb(255, 0, 0)',
  })
}
