/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {runImageGeneration} from 'src/features/image-generation/client'
import {PictureDiary} from '../PictureDiary'
import {setupDiary} from './fixtures/diary'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
const {createRepository, environment, finishPageTurn, turns} = setupDiary()

it.each(['draw', 'done', 'switch-tabs'])(
  'should save and restore an image-only diary via %s',
  async (action) => {
    const getComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
      const styles = getComputedStyle(element, pseudoElement)
      Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
      return styles
    })
    vi.stubGlobal('navigator', {
      gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:diary')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const image = {blob: new Blob(['png'], {type: 'image/png'}), prompt: 'A quiet park'}
    vi.mocked(runImageGeneration).mockResolvedValue(image)
    const repository = createRepository()
    const view = render(() => (
      <PictureDiary
        environment={environment}
        turnEnvironment={turns.environment}
        repository={repository}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
    fireEvent.click(screen.getByRole('tab', {name: '이미지 생성'}))
    fireEvent.input(await screen.findByLabelText('어떤 장면을 그릴까요?'), {
      target: {value: '공원'},
    })
    const generate = screen
      .getAllByRole('button', {name: '이미지 생성'})
      .find((button) => !button.hasAttribute('aria-pressed'))!
    await waitFor(() => expect(generate).toBeEnabled())
    fireEvent.click(generate)
    const drawOnImage = await screen.findByRole('button', {name: '이 그림 위에 그림 그리기'})
    if (action === 'switch-tabs') {
      fireEvent.click(screen.getByRole('tab', {name: '직접 그리기'}))
      fireEvent.click(screen.getByRole('tab', {name: '이미지 생성'}))
      expect(await screen.findByRole('img', {name: image.prompt})).toBeInTheDocument()
      expect(screen.getByLabelText('어떤 장면을 그릴까요?')).toHaveValue('공원')
    }
    if (action === 'draw') {
      fireEvent.click(drawOnImage)
      expect(screen.getByRole('tab', {name: '직접 그리기'})).toHaveAttribute(
        'aria-selected',
        'true',
      )
      expect(screen.getByRole('dialog').querySelector('image')).toHaveAttribute(
        'href',
        'blob:diary',
      )
    }
    fireEvent.click(screen.getByRole('button', {name: '완료'}))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
    await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
    const saved = repository.save.mock.calls[0]![0]
    expect(saved).toMatchObject({image, strokes: [], text: ''})
    view.unmount()
    render(() => (
      <PictureDiary
        environment={environment}
        turnEnvironment={turns.environment}
        repository={createRepository([saved])}
      />
    ))
    await waitFor(() =>
      expect(screen.getByLabelText('그림일기 내용').closest('section')).toHaveAttribute(
        'data-picture-diary-page',
        'previous',
      ),
    )
    fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
    await finishPageTurn()
    expect(screen.getByLabelText('저장된 일기의 그림').querySelector('image')).toHaveAttribute(
      'href',
      'blob:diary',
    )
  },
)
