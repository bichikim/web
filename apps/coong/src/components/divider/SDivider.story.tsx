import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {SDivider} from './SDivider'

const meta: Meta<typeof SDivider> = {
  component: SDivider,
  title: 'Coong/Components/SDivider',
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
