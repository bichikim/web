/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {A} from '@solidjs/router'
import {FOCUS_ROOM_SCENES} from '../../features/focus-room-animation'
import {ReviewControls} from '../layer-review/Controls'
import {ScenePicker} from '../layer-review/ScenePicker'
import {PLayerReviewViewport} from '../layer-review/Viewport'
import {PLayerReview} from '../PLayerReview'

vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('../layer-review/Controls', () => ({ReviewControls: vi.fn()}))
vi.mock('../layer-review/ScenePicker', () => ({ScenePicker: vi.fn()}))
vi.mock('../layer-review/Viewport', () => ({PLayerReviewViewport: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(A).mockImplementation((props) => {
    Object.values(props)
    return <a href={props.href}>{props.children}</a>
  })
  vi.mocked(PLayerReviewViewport).mockImplementation((props) => {
    Object.values(props)
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
    Object.values(props)
    return (
      <button onClick={() => props.onSelect('night-reading-focused')} type="button">
        다른 장면
      </button>
    )
  })
  vi.mocked(ReviewControls).mockImplementation((props) => {
    Object.values(props)
    return (
      <div>
        <button onClick={props.onCollapse} type="button">
          접기
        </button>
        <button onClick={props.onHideAll} type="button">
          모두 숨김
        </button>
        <button onClick={props.onShowAll} type="button">
          모두 표시
        </button>
        <button onClick={() => props.onAnimationChange(false)} type="button">
          애니메이션 끄기
        </button>
        <button onClick={() => props.onEyeModeChange('closed')} type="button">
          집중 시선
        </button>
        <button onClick={() => props.onSceneStyleChange('scribble')} type="button">
          낙서 스타일
        </button>
        <button onClick={() => props.onVisemeChange('open')} type="button">
          발음 변경
        </button>
        <button onClick={() => props.onMouthFrameChange('open')} type="button">
          입 프레임 적용
        </button>
        <button onClick={() => props.onMouthFrameChange(null)} type="button">
          입 프레임 해제
        </button>
        <button onClick={() => props.onMouthPositionComparisonChange(true)} type="button">
          입 위치 비교
        </button>
        <input aria-label="원본 불투명도" onInput={props.onReferenceChange} type="range" />
      </div>
    )
  })
})

describe('PLayerReview', () => {
  it('should update the preview through layer-review controls', () => {
    render(() => <PLayerReview />)

    const viewport = screen.getByText('viewport')
    expect(viewport).toHaveAttribute('data-scene-id', 'day-reading-focused')
    expect(screen.getByRole('heading', {name: '낮 · 책 읽기 · 작업에 집중'})).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '모두 숨김'}))
    expect(viewport).toHaveAttribute('data-head-visible', 'false')
    expect(viewport).toHaveAttribute('data-eyes-visible', 'false')
    expect(viewport).toHaveAttribute('data-mouth-visible', 'false')
    expect(viewport).toHaveAttribute('data-hands-visible', 'false')

    fireEvent.click(screen.getByRole('button', {name: '모두 표시'}))
    fireEvent.click(screen.getByRole('button', {name: '애니메이션 끄기'}))
    fireEvent.click(screen.getByRole('button', {name: '집중 시선'}))
    fireEvent.click(screen.getByRole('button', {name: '낙서 스타일'}))
    fireEvent.click(screen.getByRole('button', {name: '입 위치 비교'}))
    fireEvent.input(screen.getByRole('slider', {name: '원본 불투명도'}), {target: {value: '0.4'}})

    expect(viewport).toHaveAttribute('data-animation', 'false')
    expect(viewport).toHaveAttribute('data-eye-mode', 'closed')
    expect(viewport).toHaveAttribute('data-scene-style', 'scribble')
    expect(viewport).toHaveAttribute('data-mouth-comparison', 'true')
    expect(viewport).toHaveAttribute('data-reference-opacity', '0.4')

    fireEvent.click(screen.getByRole('button', {name: '입 프레임 적용'}))
    expect(viewport).toHaveAttribute('data-scene-id', 'day-reading-user')
    expect(viewport).toHaveAttribute('data-scene-style', 'original')
    expect(viewport).toHaveAttribute('data-head-visible', 'true')
    expect(viewport).toHaveAttribute('data-mouth-visible', 'true')

    fireEvent.click(screen.getByRole('button', {name: '발음 변경'}))
    fireEvent.click(screen.getByRole('button', {name: '입 프레임 해제'}))
    expect(viewport).toHaveAttribute('data-viseme', 'open')

    fireEvent.click(screen.getByRole('button', {name: '다른 장면'}))
    expect(viewport).toHaveAttribute('data-scene-id', 'night-reading-focused')
    expect(viewport).toHaveAttribute('data-reference-opacity', '0')
    expect(viewport).toHaveAttribute('data-viseme', 'rest')
  })

  it('should collapse and re-open the controls panel', () => {
    render(() => <PLayerReview />)

    fireEvent.click(screen.getByRole('button', {name: '접기'}))
    expect(screen.getByRole('button', {name: '레이어 패널 확대'})).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    fireEvent.click(screen.getByRole('button', {name: '레이어 패널 확대'}))
    expect(screen.getByRole('button', {name: '접기'})).toBeInTheDocument()
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
