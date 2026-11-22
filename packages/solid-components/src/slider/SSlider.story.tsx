import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {SSlider} from './'
import {createSignal} from 'solid-js'
import {expect, fireEvent, userEvent, waitFor, within} from 'storybook/test'

const meta = {
  component: SSlider.Root,
  title: 'Solid/components/SSlider',
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const clickBar: Story['play'] = async ({canvasElement}) => {
  const canvas = within(canvasElement)
  const disclosure = canvas.queryByText('Show slider')

  if (disclosure !== null) {
    await userEvent.click(disclosure)
  }

  const bar = canvas.getByTestId('bar')
  const slider = canvas.getByRole('slider')
  await waitFor(() => {
    expect(bar.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(bar.getBoundingClientRect().height).toBeGreaterThan(0)
  })
  const {left, top, width, height} = bar.getBoundingClientRect()

  await fireEvent.click(bar, {clientX: left + width / 2, clientY: top + height / 2})
  await expect(slider).toHaveAttribute('aria-valuenow', '50')
  await fireEvent.click(bar, {clientX: left + width * 0.75, clientY: top + height * 0.75})
  await expect(slider).toHaveAttribute('aria-valuenow', '75')
}

export const Horizontal: Story = {
  play: clickBar,
  render: () => (
    <SSlider.Root>
      <SSlider.Bar
        component="div"
        data-testid="bar"
        class="h-2rem w-20rem bg-blue-500 relative ml-30px"
      >
        <SSlider.Handle
          component="div"
          class="h-full w-2rem bg-blue-200 absolute left-[var(--var-position)]"
        />
      </SSlider.Bar>
    </SSlider.Root>
  ),
}

export const Vertical: Story = {
  play: clickBar,
  render: () => (
    <SSlider.Root type="vertical">
      <SSlider.Bar component="div" data-testid="bar" class="h-20rem w-2rem bg-blue-500 relative">
        <SSlider.Handle
          component="div"
          class="h-2rem w-full bg-blue-200 absolute top-[var(--var-position)]"
        />
      </SSlider.Bar>
    </SSlider.Root>
  ),
}

export const InitiallyHidden: Story = {
  play: clickBar,
  render: () => (
    <details>
      <summary>Show slider</summary>
      <SSlider.Root>
        <SSlider.Bar component="div" data-testid="bar" class="h-2rem w-20rem bg-blue-500 relative">
          <SSlider.Handle
            component="div"
            class="h-full w-2rem bg-blue-200 absolute left-[var(--var-position)]"
          />
        </SSlider.Bar>
      </SSlider.Root>
    </details>
  ),
}

const ResizableSlider = () => {
  const [expanded, setExpanded] = createSignal(false)
  const handleResize = () => setExpanded((value) => !value)
  return (
    <>
      <button onClick={handleResize}>Resize track</button>
      <SSlider.Root>
        <SSlider.Bar
          component="div"
          data-testid="bar"
          class="h-2rem bg-blue-500 relative"
          classList={{'w-20rem': !expanded(), 'w-40rem': expanded()}}
        >
          <SSlider.Handle
            component="div"
            aria-label="Resizable slider"
            class="h-full w-2rem bg-blue-200 absolute left-[var(--var-position)]"
          />
        </SSlider.Bar>
      </SSlider.Root>
    </>
  )
}

export const Resizable: Story = {
  play: async (context) => {
    await clickBar(context)
    const canvas = within(context.canvasElement)
    const bar = canvas.getByTestId('bar')
    const handle = canvas.getByRole('slider')
    await userEvent.click(canvas.getByRole('button', {name: 'Resize track'}))
    await waitFor(() => {
      const bounds = bar.getBoundingClientRect()
      const knob = handle.getBoundingClientRect()
      expect(bounds.width).toBe(640)
      expect(knob.left - bounds.left).toBeCloseTo((bounds.width - knob.width) * 0.75)
    })
    const bounds = bar.getBoundingClientRect()
    await fireEvent.click(bar, {
      clientX: bounds.left + bounds.width * 0.75,
      clientY: bounds.top + bounds.height / 2,
    })
    await expect(handle).toHaveAttribute('aria-valuenow', '75')
  },
  render: ResizableSlider,
}
