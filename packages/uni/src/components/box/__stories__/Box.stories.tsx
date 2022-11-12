import {UBox} from '../'

import {Meta, StoryFn} from '@storybook/vue3'

export default {
  component: UBox,
  title: 'Components/UBox',
} as Meta<typeof UBox>

export const Default: StoryFn<typeof UBox> = () => ({
  render() {
    return <UBox>hello</UBox>
  },
})
