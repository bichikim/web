/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {A} from '@solidjs/router'
import {FOCUS_ROOM_SCENES} from '../../../features/focus-room-animation'
import {ReviewControls} from '../../layer-review/Controls'
import {ScenePicker} from '../../layer-review/ScenePicker'
import {PLayerReviewViewport} from '../../layer-review/Viewport'
import {PLayerReview} from '../PLayerReview'

vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('../../layer-review/Controls', () => ({ReviewControls: vi.fn()}))
vi.mock('../../layer-review/ScenePicker', () => ({ScenePicker: vi.fn()}))
vi.mock('../../layer-review/Viewport', () => ({PLayerReviewViewport: vi.fn()}))

let reviewControlsProps: Parameters<typeof ReviewControls>[0] | undefined
let scenePickerProps: Parameters<typeof ScenePicker>[0] | undefined

beforeEach(() => {
  vi.clearAllMocks()
  reviewControlsProps = undefined
  scenePickerProps = undefined
  vi.mocked(A).mockImplementation((props) => {
    return <a href={props.href}>{props.children}</a>
  })
  vi.mocked(PLayerReviewViewport).mockImplementation((props) => {
    return (
      <output
        data-animation={String(props.animationEnabled)}
        data-eye-mode={props.eyeMode}
        data-eyes-visible={String(props.eyesVisible)}
        data-hands-visible={String(props.handsVisible)}
        data-head-visible={String(props.headVisible)}
        data-mouth-comparison={String(props.mouthPositionComparison)}
        data-mouth-visible={String(props.mouthVisible)}
        data-reference-opacity={String(props.referenceOpacity)}
        data-scene-id={props.sceneId}
        data-scene-style={props.sceneStyle}
        data-viseme={props.viseme}
      >
        viewport
      </output>
    )
  })
  vi.mocked(ScenePicker).mockImplementation((props) => {
    scenePickerProps = props
    return null
  })
  vi.mocked(ReviewControls).mockImplementation((props) => {
    reviewControlsProps = props
    return <div data-testid="review-controls" />
  })
})

const getReviewControlsProps = (): Parameters<typeof ReviewControls>[0] => {
  if (reviewControlsProps === undefined) {
    throw new Error('Expected the review controls to be mounted.')
  }

  return reviewControlsProps
}

const getScenePickerProps = (): Parameters<typeof ScenePicker>[0] => {
  if (scenePickerProps === undefined) {
    throw new Error('Expected the scene picker to be mounted.')
  }

  return scenePickerProps
}

describe('PLayerReview', () => {
  it('should update the preview through layer-review controls', () => {
    render(() => <PLayerReview />)

    const viewport = screen.getByText('viewport')
    expect(viewport).toHaveAttribute('data-scene-id', 'day-reading-focused')
    expect(screen.getByRole('heading', {name: '낮 · 책 읽기 · 작업에 집중'})).toBeInTheDocument()
    expect(screen.getByTestId('review-controls')).toBeInTheDocument()

    getReviewControlsProps().onHideAll()
    expect(viewport).toHaveAttribute('data-head-visible', 'false')
    expect(viewport).toHaveAttribute('data-eyes-visible', 'false')
    expect(viewport).toHaveAttribute('data-mouth-visible', 'false')
    expect(viewport).toHaveAttribute('data-hands-visible', 'false')

    getReviewControlsProps().onShowAll()
    getReviewControlsProps().onAnimationChange(false)
    getReviewControlsProps().onEyeModeChange('closed')
    getReviewControlsProps().onSceneStyleChange('scribble')
    getReviewControlsProps().onMouthPositionComparisonChange(true)
    getReviewControlsProps().onReferenceChange(0.4)

    expect(viewport).toHaveAttribute('data-animation', 'false')
    expect(viewport).toHaveAttribute('data-eye-mode', 'closed')
    expect(viewport).toHaveAttribute('data-scene-style', 'scribble')
    expect(viewport).toHaveAttribute('data-mouth-comparison', 'true')
    expect(viewport).toHaveAttribute('data-reference-opacity', '0.4')

    getReviewControlsProps().onMouthFrameChange('open')
    expect(viewport).toHaveAttribute('data-scene-id', 'day-reading-user')
    expect(viewport).toHaveAttribute('data-scene-style', 'original')
    expect(viewport).toHaveAttribute('data-head-visible', 'true')
    expect(viewport).toHaveAttribute('data-mouth-visible', 'true')

    getReviewControlsProps().onVisemeChange('open')
    getReviewControlsProps().onMouthFrameChange(null)
    expect(viewport).toHaveAttribute('data-viseme', 'open')

    getScenePickerProps().onSelect('night-reading-focused')
    expect(viewport).toHaveAttribute('data-scene-id', 'night-reading-focused')
    expect(viewport).toHaveAttribute('data-reference-opacity', '0')
    expect(viewport).toHaveAttribute('data-viseme', 'rest')
  })

  it('should collapse and re-open the controls panel', () => {
    render(() => <PLayerReview />)

    getReviewControlsProps().onCollapse()
    expect(screen.getByRole('button', {name: '레이어 패널 확대'})).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    fireEvent.click(screen.getByRole('button', {name: '레이어 패널 확대'}))
    expect(screen.getByTestId('review-controls')).toBeInTheDocument()
  })

  it('should report a missing initial preview scene', () => {
    const scenes = [...FOCUS_ROOM_SCENES]
    const mutableScenes = FOCUS_ROOM_SCENES as Array<(typeof FOCUS_ROOM_SCENES)[number]>

    mutableScenes.splice(0)

    try {
      expect(() => render(() => <PLayerReview />)).toThrow('Missing preview scene')
    } finally {
      mutableScenes.push(...scenes)
    }
  })
})
