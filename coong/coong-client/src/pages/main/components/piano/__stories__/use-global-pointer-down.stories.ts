import {expect} from '@storybook/jest'
import {useGlobalPointDown} from '../use-global-pointer-down'
import {defineComponent, h} from 'vue'
import {StoryFn} from '@storybook/vue3'
import {fireEvent, within} from '@storybook/testing-library'

export default {
  title: 'coong-client/use-global-pointer-down',
}

const Component = defineComponent({
  setup() {
    const down = useGlobalPointDown()
    return () => h('div', down.value)
  },
})

export const Default: StoryFn = () => {
  return {
    setup() {
      const down = useGlobalPointDown()
      return () =>
        h('div', {'data-testid': 'root'}, [
          //
          h('span', down.value),
          h(Component),
        ])
    },
  }
}

Default.play = async ({canvasElement}) => {
  const canvas = within(canvasElement)

  expect(canvas.getByTestId('root')).toHaveTextContent('falsefalse')

  fireEvent.mouseDown(window)

  // wait for re-rendering
  await within(canvasElement).findByTestId('root')

  await expect(within(canvasElement).getByTestId('root')).toHaveTextContent('truetrue')

  // restore
  fireEvent.mouseUp(window)
}
