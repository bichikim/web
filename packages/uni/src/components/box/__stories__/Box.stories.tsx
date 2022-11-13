import {UBox} from '../'
import {h} from 'vue'
import {Meta, StoryFn} from '@storybook/vue3'

export default {
  component: UBox,
  title: 'Components/UBox',
} as Meta<typeof UBox>

export const Default: StoryFn<typeof UBox> = () => ({
  render() {
    return h(UBox, 'hello')
  },
})
