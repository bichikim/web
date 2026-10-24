import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {FocusCandidateVisualizer} from './FocusCandidateVisualizer'

const meta: Meta<typeof FocusCandidateVisualizer> = {
  component: FocusCandidateVisualizer,
  title: 'Coong/Utils/SpaceFocus/FocusCandidate',
}

export default meta
type Story = StoryObj<typeof FocusCandidateVisualizer>

export const Default: Story = {}
