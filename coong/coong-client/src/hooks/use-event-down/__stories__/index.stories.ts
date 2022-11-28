import {expect} from '@storybook/jest'
import {fireEvent, within} from '@storybook/testing-library'
import {StoryFn} from '@storybook/vue3'
import {h, ref} from 'vue'
import {useEventDown} from '../'

export default {
  title: 'coong-client/hooks/use-event-down',
}

export const Default: StoryFn = () => {
  return {
    setup() {
      const element = ref()
      const down = useEventDown(element)
      return () => h('div', {'data-testid': 'root', ref: element}, down.value)
    },
  }
}

Default.play = async ({canvasElement}) => {
  const canvas = within(canvasElement)

  expect(canvas.getByTestId('root')).toHaveTextContent('false')

  fireEvent.pointerDown(canvas.getByTestId('root'))

  // wait for re-rendering
  await within(canvasElement).findByTestId('root')

  await expect(within(canvasElement).getByTestId('root')).toHaveTextContent('true')

  // restore
  fireEvent.pointerUp(canvas.getByTestId('root'))
}
