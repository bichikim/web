/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {
  type CharacterRendererController,
  useCharacterRenderer,
} from '../../features/character-renderer'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {CharacterStudio} from '../CharacterStudio'

vi.mock('../../features/character-renderer', () => ({useCharacterRenderer: vi.fn()}))
vi.mock('../character-studio/Viewport', () => ({
  CharacterViewport: (props: {
    readonly eyeNarrowing?: number
    readonly modelUrl: string
    readonly onLoadError: () => void
    readonly onLoadProgress: (progress: number) => void
    readonly onLoadStart: () => void
    readonly onLoadSuccess: () => void
    readonly progress: number
    readonly status: string
  }) => (
    <section
      data-eye-narrowing={props.eyeNarrowing}
      data-model-url={props.modelUrl}
      data-progress={props.progress}
      data-status={props.status}
    >
      <button onClick={props.onLoadStart} type="button">
        로드 시작
      </button>
      <button onClick={() => props.onLoadProgress(75)} type="button">
        진행 갱신
      </button>
      <button onClick={props.onLoadSuccess} type="button">
        로드 성공
      </button>
      <button onClick={props.onLoadError} type="button">
        로드 오류
      </button>
    </section>
  ),
}))

const createRenderer = (): CharacterRendererController => ({
  handleLoadError: vi.fn(),
  handleLoadProgress: vi.fn(),
  handleLoadStart: vi.fn(),
  handleLoadSuccess: vi.fn(),
  loadDefaultModel: vi.fn(),
  loadFile: vi.fn(),
  loadUrl: vi.fn(),
  modelName: () => '현재 캐릭터.glb',
  modelUrl: () => 'https://pomofi.io/models/current.glb',
  progress: () => 25,
  status: () => 'loading',
})

describe('CharacterStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should control and reset eye width for the default model', () => {
    const renderer = createRenderer()
    vi.mocked(useCharacterRenderer).mockReturnValue({
      ...renderer,
      modelUrl: () => '/character-studio/scene.glb',
    })
    render(() => <CharacterStudio />)
    const slider = screen.getByRole('slider', {name: '눈 가로폭 좁힘 정도'})
    fireEvent.input(slider, {target: {value: '1'}})
    expect(document.querySelector('[data-eye-narrowing]')).toHaveAttribute(
      'data-eye-narrowing',
      '1',
    )
    fireEvent.click(screen.getByRole('button', {name: '눈 가로폭 초기화'}))
    expect(slider).toHaveValue('0')
    expect(document.querySelector('[data-eye-narrowing]')).toHaveAttribute(
      'data-eye-narrowing',
      '0',
    )
  })

  it('should retain VRoid settings when switching to Pomo and back', () => {
    const [url, setUrl] = createSignal('/character-studio/scene.glb')
    const renderer = createRenderer()
    vi.mocked(useCharacterRenderer).mockReturnValue({
      ...renderer,
      loadDefaultModel: () => {
        setUrl('/character-studio/pomo.glb')
      },
      loadUrl: (value) => {
        setUrl(value)
        return true
      },
      modelUrl: url,
      status: () => 'ready',
    })
    render(() => <CharacterStudio />)
    fireEvent.input(screen.getByRole('slider', {name: '눈 가로폭 좁힘 정도'}), {
      target: {value: '0.4'},
    })
    fireEvent.click(screen.getByRole('button', {name: 'Pomo'}))
    expect(screen.queryByRole('slider', {name: '눈 가로폭 좁힘 정도'})).not.toBeInTheDocument()
    expect(document.querySelector('[data-model-url]')).toHaveAttribute(
      'data-model-url',
      '/character-studio/pomo.glb',
    )
    fireEvent.click(screen.getByRole('button', {name: 'VRoid'}))
    expect(screen.getByRole('slider', {name: '눈 가로폭 좁힘 정도'})).toHaveValue('0.4')
  })

  it('should initialize the renderer and forward viewport lifecycle events', () => {
    const renderer = createRenderer()
    vi.mocked(useCharacterRenderer).mockReturnValue(renderer)

    render(() => <CharacterStudio />)

    expect(useCharacterRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultModelName: 'Pomo · 파츠 분리 모델',
        defaultModelUrl: '/character-studio/pomo.glb',
      }),
    )
    expect(screen.getByText('현재 캐릭터.glb')).toBeInTheDocument()
    expect(document.querySelector('[data-model-url]')).toHaveAttribute(
      'data-model-url',
      'https://pomofi.io/models/current.glb',
    )
    expect(document.querySelector('[data-status]')).toHaveAttribute('data-status', 'loading')
    expect(document.querySelector('[data-progress]')).toHaveAttribute('data-progress', '25')

    fireEvent.click(screen.getByRole('button', {name: '로드 시작'}))
    fireEvent.click(screen.getByRole('button', {name: '진행 갱신'}))
    fireEvent.click(screen.getByRole('button', {name: '로드 성공'}))
    fireEvent.click(screen.getByRole('button', {name: '로드 오류'}))

    expect(renderer.handleLoadStart).toHaveBeenCalledOnce()
    expect(renderer.handleLoadProgress).toHaveBeenCalledWith(75)
    expect(renderer.handleLoadSuccess).toHaveBeenCalledOnce()
    expect(renderer.handleLoadError).toHaveBeenCalledOnce()
  })

  it('should load a selected file and reset the picker', () => {
    const renderer = createRenderer()
    vi.mocked(useCharacterRenderer).mockReturnValue(renderer)
    const {container} = render(() => <CharacterStudio />)
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['glb'], 'portrait.glb', {type: 'model/gltf-binary'})

    fireEvent.change(fileInput, {target: {files: []}})
    fireEvent.change(fileInput, {target: {files: [file]}})

    expect(renderer.loadFile).toHaveBeenCalledOnce()
    expect(renderer.loadFile).toHaveBeenCalledWith(file)
    expect(fileInput).toHaveValue('')
  })

  it('should load accepted URLs, retain rejected URLs, and restore the default model', () => {
    const renderer = createRenderer()
    vi.mocked(renderer.loadUrl).mockReturnValueOnce(true).mockReturnValueOnce(false)
    vi.mocked(useCharacterRenderer).mockReturnValue(renderer)

    render(() => <CharacterStudio />)
    const input = screen.getByRole('textbox', {name: 'GLB URL'})

    fireEvent.input(input, {target: {value: ' https://pomofi.io/models/new.glb '}})
    expect(screen.getByRole('button', {name: 'URL 모델 불러오기'})).toBeEnabled()
    fireEvent.submit(input.closest('form')!)
    expect(renderer.loadUrl).toHaveBeenCalledWith('https://pomofi.io/models/new.glb')
    expect(input).toHaveValue('')

    fireEvent.input(input, {target: {value: 'https://pomofi.io/models/rejected.glb'}})
    fireEvent.submit(input.closest('form')!)
    expect(renderer.loadUrl).toHaveBeenLastCalledWith('https://pomofi.io/models/rejected.glb')
    expect(input).toHaveValue('https://pomofi.io/models/rejected.glb')

    fireEvent.click(screen.getByRole('button', {name: '기본 캐릭터로 되돌리기'}))
    expect(renderer.loadDefaultModel).toHaveBeenCalledOnce()
    expect(input).toHaveValue('')
  })
})
