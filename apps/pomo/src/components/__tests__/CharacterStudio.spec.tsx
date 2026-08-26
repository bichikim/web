/** @vitest-environment jsdom */

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
    readonly modelUrl: string
    readonly onLoadError: () => void
    readonly onLoadProgress: (progress: number) => void
    readonly onLoadStart: () => void
    readonly onLoadSuccess: () => void
    readonly progress: number
    readonly status: string
  }) => (
    <section
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

  it('should initialize the renderer and forward viewport lifecycle events', () => {
    const renderer = createRenderer()
    vi.mocked(useCharacterRenderer).mockReturnValue(renderer)

    render(() => <CharacterStudio />)

    expect(useCharacterRenderer).toHaveBeenCalledWith(
      expect.objectContaining({defaultModelName: 'Blender · character-studio.blend'}),
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
