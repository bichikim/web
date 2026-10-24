import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {ReviewControls} from './Controls'

const meta = {
  args: {
    animationEnabled: true,
    eyeMode: 'open' as const,
    eyesVisible: true,
    handsVisible: false,
    headVisible: true,
    mouthFrame: null,
    mouthPositionComparison: false,
    mouthVisible: true,
    onAnimationChange: fn(),
    onCollapse: fn(),
    onEyeModeChange: fn(),
    onEyesChange: fn(),
    onHandsChange: fn(),
    onHeadChange: fn(),
    onHideAll: fn(),
    onMouthChange: fn(),
    onMouthFrameChange: fn(),
    onMouthPositionComparisonChange: fn(),
    onReferenceChange: fn(),
    onSceneStyleChange: fn(),
    onShowAll: fn(),
    onVisemeChange: fn(),
    referenceOpacity: 0.5,
    referencePercentage: 50,
    sceneStyle: 'scribble' as const,
    viseme: 'rest' as const,
  },
  argTypes: {
    onReferenceChange: {table: {category: 'Events'}},
    referenceOpacity: {control: {max: 1, min: 0, step: 0.05, type: 'range'}},
  },
  component: ReviewControls,
  title: 'Pomo/Components/LayerReview/Controls',
} satisfies Meta<typeof ReviewControls>

export default meta
type Story = StoryObj<typeof meta>

export const OverlayAlignment: Story = {
  play: async ({args, canvasElement}) => {
    const thumb = within(canvasElement).getByRole('slider', {name: '원본 오버레이'})
    thumb.scrollIntoView({block: 'center'})
    const track = thumb.parentElement
    if (track === null) {
      throw new Error('Slider track is missing')
    }
    const trackBounds = track.getBoundingClientRect()
    const thumbBounds = thumb.getBoundingClientRect()
    await expect(trackBounds.height).toBeGreaterThan(0)
    await expect(thumbBounds.top + thumbBounds.height / 2).toBeCloseTo(
      trackBounds.top + trackBounds.height / 2,
      1,
    )
    await expect(thumbBounds.left + thumbBounds.width / 2).toBeCloseTo(
      trackBounds.left + trackBounds.width * args.referenceOpacity,
      1,
    )
    thumb.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(thumb).toHaveFocus()
    await expect(args.onReferenceChange).toHaveBeenCalledWith(0.55)
  },
}
