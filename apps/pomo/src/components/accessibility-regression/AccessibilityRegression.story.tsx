import axe from 'axe-core'
import {expect} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

const MissingAccessibleNameButton = () => <button type="button" />

const meta = {
  component: MissingAccessibleNameButton,
  parameters: {a11y: {test: 'off'}},
  title: 'Pomo/Kata/AccessibilityRegression',
} satisfies Meta<typeof MissingAccessibleNameButton>

export default meta
type Story = StoryObj<typeof meta>

export const MissingButtonName: Story = {
  play: async ({canvasElement}) => {
    const result = await axe.run(canvasElement, {runOnly: ['button-name']})

    await expect(result.violations.map(({id}) => id)).toEqual(['button-name'])
  },
}
