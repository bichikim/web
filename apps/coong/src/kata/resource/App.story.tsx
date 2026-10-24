import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {ResourceKata} from './index'

const meta = {
  component: ResourceKata,
  title: 'Coong/Kata/Resource',
} satisfies Meta<typeof ResourceKata>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <ResourceKata />,
}
