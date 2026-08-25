/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {CharacterViewport} from '../Viewport'

vi.mock('../ViewportCanvas', () => ({
  CharacterViewportCanvas: (props: {
    readonly modelUrl: string
    readonly onLoadError: () => void
    readonly onLoadProgress: (progress: number) => void
    readonly onLoadStart: () => void
    readonly onLoadSuccess: () => void
  }) => (
    <div data-model-url={props.modelUrl}>
      <button onClick={props.onLoadStart} type="button">
        시작
      </button>
      <button onClick={() => props.onLoadProgress(64)} type="button">
        진행
      </button>
      <button onClick={props.onLoadSuccess} type="button">
        성공
      </button>
      <button onClick={props.onLoadError} type="button">
        오류
      </button>
    </div>
  ),
}))

const createCallbacks = () => ({
  onLoadError: vi.fn(),
  onLoadProgress: vi.fn(),
  onLoadStart: vi.fn(),
  onLoadSuccess: vi.fn(),
})

describe('CharacterViewport', () => {
  it('should show loading progress and forward canvas lifecycle events', () => {
    const callbacks = createCallbacks()
    const {container} = render(() => (
      <CharacterViewport modelUrl="/loading.glb" progress={32} status="loading" {...callbacks} />
    ))

    expect(screen.getByText('Babylon.js 렌더러를 준비하고 있어요.')).toBeInTheDocument()
    expect(screen.getByText('모델 로딩 32%')).toBeInTheDocument()
    expect(container.querySelector('[data-model-url]')).toHaveAttribute(
      'data-model-url',
      '/loading.glb',
    )
    expect(container.querySelector('.animate-spin')).not.toBeNull()
    expect(container.querySelector('.bg-\\#efb18f')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '시작'}))
    fireEvent.click(screen.getByRole('button', {name: '진행'}))
    fireEvent.click(screen.getByRole('button', {name: '성공'}))
    fireEvent.click(screen.getByRole('button', {name: '오류'}))

    expect(callbacks.onLoadStart).toHaveBeenCalledOnce()
    expect(callbacks.onLoadProgress).toHaveBeenCalledWith(64)
    expect(callbacks.onLoadSuccess).toHaveBeenCalledOnce()
    expect(callbacks.onLoadError).toHaveBeenCalledOnce()
  })

  it('should explain canvas loading errors', () => {
    const {container} = render(() => (
      <CharacterViewport
        modelUrl="/broken.glb"
        progress={0}
        status="error"
        {...createCallbacks()}
      />
    ))

    expect(screen.getByText('이 브라우저에서 3D 모델을 불러오지 못했어요.')).toBeInTheDocument()
    expect(screen.getByText('3D 엔진을 불러오지 못했어요')).toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('should remove the blocking overlay after the renderer is ready', () => {
    const {container} = render(() => (
      <CharacterViewport
        modelUrl="/ready.glb"
        progress={100}
        status="ready"
        {...createCallbacks()}
      />
    ))

    expect(screen.queryByText('Babylon.js 렌더러를 준비하고 있어요.')).toBeNull()
    expect(screen.getByText('렌더링 중')).toBeInTheDocument()
    expect(container.querySelector('.bg-\\#78d7b7')).not.toBeNull()
    expect(screen.getByText('드래그해서 회전 · 휠로 확대')).toBeInTheDocument()
  })
})
