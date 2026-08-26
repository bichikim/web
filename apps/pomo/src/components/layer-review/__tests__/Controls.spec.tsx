/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {PEyeMode} from '../../../features/focus-room-animation'
import type {PReviewMouthFrame} from '../../../features/focus-room-layer-review/scene-renderer'
import type {PViseme} from '../../../features/lip-sync'
import {describe, expect, it, vi} from 'vitest'

vi.mock('../LayerToggle', () => ({
  LayerToggle: (props: {
    readonly checked: boolean
    readonly description: string
    readonly label: string
    readonly onChange: (checked: boolean) => void
  }) => (
    <button
      aria-pressed={props.checked}
      data-description={props.description}
      onClick={() => props.onChange(!props.checked)}
      type="button"
    >
      {props.label}
    </button>
  ),
}))

vi.mock('../EyeModePicker', () => ({
  EyeModePicker: (props: {
    readonly eyeMode: PEyeMode
    readonly onChange: (eyeMode: PEyeMode) => void
  }) => (
    <button data-eye-mode={props.eyeMode} onClick={() => props.onChange('closed')} type="button">
      눈 단계
    </button>
  ),
}))

vi.mock('../VisemePicker', () => ({
  VisemePicker: (props: {
    readonly onChange: (viseme: PViseme) => void
    readonly viseme: PViseme
  }) => (
    <button data-viseme={props.viseme} onClick={() => props.onChange('wide')} type="button">
      입 모양
    </button>
  ),
}))

vi.mock('../MouthFramePicker', () => ({
  MouthFramePicker: (props: {
    readonly mouthFrame: PReviewMouthFrame | null
    readonly mouthPositionComparison: boolean
    readonly onChange: (mouthFrame: PReviewMouthFrame | null) => void
    readonly onPositionComparisonChange: (enabled: boolean) => void
  }) => (
    <div data-mouth-frame={props.mouthFrame ?? 'transition'}>
      <button onClick={() => props.onChange('round')} type="button">
        입 프레임
      </button>
      <button
        onClick={() => props.onPositionComparisonChange(!props.mouthPositionComparison)}
        type="button"
      >
        입 위치 비교
      </button>
    </div>
  ),
}))

import {ReviewControls} from '../Controls'

const createProps = () => ({
  animationEnabled: true,
  eyeMode: 'open' as const,
  eyesVisible: true,
  handsVisible: false,
  headVisible: true,
  mouthFrame: null,
  mouthPositionComparison: false,
  mouthVisible: true,
  onAnimationChange: vi.fn(),
  onCollapse: vi.fn(),
  onEyeModeChange: vi.fn(),
  onEyesChange: vi.fn(),
  onHandsChange: vi.fn(),
  onHeadChange: vi.fn(),
  onHideAll: vi.fn(),
  onMouthChange: vi.fn(),
  onMouthFrameChange: vi.fn(),
  onMouthPositionComparisonChange: vi.fn(),
  onReferenceChange: vi.fn(),
  onSceneStyleChange: vi.fn(),
  onShowAll: vi.fn(),
  onVisemeChange: vi.fn(),
  referenceOpacity: 0.5,
  referencePercentage: 50,
  sceneStyle: 'scribble' as const,
  viseme: 'rest' as const,
})

describe('ReviewControls', () => {
  it('should render scribble controls and forward every child control change', () => {
    const props = createProps()
    render(() => <ReviewControls {...props} />)

    expect(screen.getByRole('complementary', {name: '레이어 검사 도구'})).toHaveAttribute(
      'id',
      'layer-review-controls',
    )
    expect(screen.getByText('하찮은 픽셀')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '하찮은 스타일'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('checkbox', {name: /미세 애니메이션/})).toBeChecked()
    expect(screen.getByText('50%')).toHaveAttribute('for', 'reference-opacity')
    expect(screen.getByRole('slider', {name: '원본 오버레이'})).toHaveValue('0.5')

    fireEvent.click(screen.getByRole('button', {name: '레이어 패널 축소'}))
    fireEvent.click(screen.getByRole('button', {name: '하찮은 스타일'}))
    fireEvent.change(screen.getByRole('checkbox', {name: /미세 애니메이션/}), {
      target: {checked: false},
    })
    fireEvent.click(screen.getByRole('button', {name: '머리 레이어'}))
    fireEvent.click(screen.getByRole('button', {name: '눈 레이어'}))
    fireEvent.click(screen.getByRole('button', {name: '입 레이어'}))
    fireEvent.click(screen.getByRole('button', {name: '손 레이어'}))
    fireEvent.click(screen.getByRole('button', {name: '눈 단계'}))
    fireEvent.click(screen.getByRole('button', {name: '입 모양'}))
    fireEvent.click(screen.getByRole('button', {name: '입 프레임'}))
    fireEvent.click(screen.getByRole('button', {name: '입 위치 비교'}))
    fireEvent.click(screen.getByRole('button', {name: '모두 표시'}))
    fireEvent.click(screen.getByRole('button', {name: '모두 숨김'}))
    fireEvent.input(screen.getByRole('slider', {name: '원본 오버레이'}), {
      target: {value: '0.75'},
    })

    expect(props.onCollapse).toHaveBeenCalledOnce()
    expect(props.onSceneStyleChange).toHaveBeenCalledWith('original')
    expect(props.onAnimationChange).toHaveBeenCalledWith(false)
    expect(props.onHeadChange).toHaveBeenCalledWith(false)
    expect(props.onEyesChange).toHaveBeenCalledWith(false)
    expect(props.onMouthChange).toHaveBeenCalledWith(false)
    expect(props.onHandsChange).toHaveBeenCalledWith(true)
    expect(props.onEyeModeChange).toHaveBeenCalledWith('closed')
    expect(props.onVisemeChange).toHaveBeenCalledWith('wide')
    expect(props.onMouthFrameChange).toHaveBeenCalledWith('round')
    expect(props.onMouthPositionComparisonChange).toHaveBeenCalledWith(true)
    expect(props.onShowAll).toHaveBeenCalledOnce()
    expect(props.onHideAll).toHaveBeenCalledOnce()
    expect(props.onReferenceChange).toHaveBeenCalledOnce()
  })

  it('should present the original style and enable scribble from an unchecked switch', () => {
    const props = {...createProps(), sceneStyle: 'original' as const}
    render(() => <ReviewControls {...props} />)

    expect(screen.getByText('원본 픽셀')).toBeInTheDocument()
    const styleToggle = screen.getByRole('button', {name: '하찮은 스타일'})
    expect(styleToggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(styleToggle)
    expect(props.onSceneStyleChange).toHaveBeenCalledWith('scribble')
  })
})
