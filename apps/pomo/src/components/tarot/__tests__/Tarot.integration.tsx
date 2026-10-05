/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {
  TAROT_CARDS,
  type TarotReadingController,
  type TarotSpeechController,
  useTarotSpeech,
} from '../../../features/tarot'
import {Tarot} from '../Tarot'
import {PModelDownloadProvider} from '../../../features/model-download'

const TarotFixture = (props: {readonly reading: TarotReadingController}) => {
  const speech = useTarotSpeech({locale: () => 'ko', text: props.reading.output})
  return <Tarot locale="ko" reading={props.reading} speech={speech} />
}

it('should keep options above the cards and preserve cards while interpreting', () => {
  const [cards] = createSignal(
    TAROT_CARDS.slice(0, 3).map((card) => ({...card, orientation: 'reversed' as const})),
  )
  const [showCardsUpright, setShowCardsUpright] = createSignal(true)
  const [status, setStatus] = createSignal<
    'checking' | 'consent' | 'downloading' | 'preparing' | 'generating' | 'unsupported'
  >('unsupported')
  const reading: TarotReadingController = {
    cancel: vi.fn(),
    cancelDownload: vi.fn(),
    cancelDownloadConsent: vi.fn(),
    cards,
    count: () => 3,
    downloadKind: () => 'text',
    downloadSize: () => '약 3.7GB',
    draw: vi.fn(),
    error: () => null,
    output: () => '',
    progress: () => 16,
    question: () => '',
    retry: vi.fn(),
    setCount: vi.fn(),
    setQuestion: vi.fn(),
    setShowCardsUpright,
    showCardsUpright,
    startDownload: vi.fn(),
    status,
  }

  render(() => (
    <PModelDownloadProvider>
      <TarotFixture reading={reading} />
    </PModelDownloadProvider>
  ))

  expect(screen.getByRole('button', {name: '다시 뽑기'})).toBeInTheDocument()
  screen.getAllByRole('article').forEach((article) => fireEvent.load(article.querySelector('img')!))
  expect(screen.getByRole('article', {name: '과거'})).toHaveTextContent(TAROT_CARDS[0]!.name.ko)
  expect(screen.getByRole('article', {name: '현재'})).toHaveTextContent(TAROT_CARDS[1]!.name.ko)
  expect(screen.getByRole('article', {name: '미래'})).toHaveTextContent(TAROT_CARDS[2]!.name.ko)
  expect(document.querySelectorAll('article img')).toHaveLength(3)
  expect(screen.queryAllByRole('img')).toHaveLength(0)
  expect(screen.getByText(/Gemma 4 해석을 실행할 수 없어요/)).toBeInTheDocument()

  const uprightView = screen.getByRole('checkbox', {name: '카드는 정방향으로 보기'})
  const options = screen.getByRole('group', {name: '타로 옵션'})
  expect(within(options).getByRole('checkbox', {name: '카드는 정방향으로 보기'})).toBe(uprightView)
  const autoRead = within(options).getByRole('checkbox', {name: '자동으로 읽어주기'})
  expect(options.compareDocumentPosition(screen.getByRole('article', {name: '과거'}))).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  expect(autoRead).not.toBeChecked()
  fireEvent.click(autoRead)
  expect(autoRead).toBeChecked()
  fireEvent.click(autoRead)
  const originalCards = cards()
  const frame = screen.getByRole('article', {name: '과거'}).querySelector('img')!
    .parentElement!.parentElement!
  expect(uprightView).toBeChecked()
  expect(frame).not.toHaveClass('rotate-180')
  fireEvent.click(uprightView)
  expect(uprightView).not.toBeChecked()
  expect(frame).toHaveClass('rotate-180')
  expect(screen.getByRole('article', {name: '과거'})).toHaveTextContent('역방향')
  expect(cards()).toBe(originalCards)
  expect(reading.draw).not.toHaveBeenCalled()
  expect(reading.retry).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('radio', {name: '5장'}))
  expect(reading.setCount).toHaveBeenCalledWith(5)

  setStatus('consent')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  expect(reading.startDownload).toHaveBeenCalledOnce()

  setStatus('downloading')
  const downloadStatus = screen.getByRole('status')
  expect(downloadStatus).toHaveTextContent('모델 다운로드 중 · 16%')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '16')
  expect(downloadStatus.compareDocumentPosition(screen.getByRole('article', {name: '과거'}))).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(screen.getByRole('heading', {name: '카드 해석'})).toBeInTheDocument()
  expect(document.querySelector('.animate-glint')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '해석 취소'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '다운로드 취소'}))
  expect(reading.cancelDownload).toHaveBeenCalledOnce()
  expect(reading.cancel).not.toHaveBeenCalled()

  setStatus('checking')
  expect(screen.getByRole('checkbox', {name: '자동으로 읽어주기'})).toBe(autoRead)
  expect(screen.getByRole('checkbox', {name: '카드는 정방향으로 보기'})).toBe(uprightView)
  expect(screen.getByRole('button', {name: '카드를 해석하고 있어요…'})).toBeDisabled()
  expect(screen.getByRole('heading', {name: '카드 해석'})).toBeInTheDocument()
  expect(document.querySelector('.animate-glint')).toBeInTheDocument()

  setStatus('preparing')
  expect(screen.queryByText('해석을 준비하고 있어요…')).not.toBeInTheDocument()
  expect(document.querySelector('.animate-glint')).toBeInTheDocument()

  setStatus('generating')
  expect(screen.queryByRole('button', {name: '다시 뽑기'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '해석 취소'})).toBeInTheDocument()
  expect(screen.getByRole('article', {name: '과거'})).toBeInTheDocument()
})

it('should route voice download consent and progress through the Tarot UI while keeping text drawing available', () => {
  const [cards] = createSignal(
    TAROT_CARDS.slice(0, 3).map((card) => ({...card, orientation: 'upright' as const})),
  )
  const [readingStatus] = createSignal<ReturnType<TarotReadingController['status']>>('complete')
  const [speechStatus, setSpeechStatus] =
    createSignal<ReturnType<TarotSpeechController['status']>>('idle')
  const draw = vi.fn()
  const cancelTextDownload = vi.fn()
  const startTextDownload = vi.fn()
  const reading: TarotReadingController = {
    cancel: vi.fn(),
    cancelDownload: cancelTextDownload,
    cancelDownloadConsent: vi.fn(),
    cards,
    count: () => 3,
    downloadKind: () => 'text',
    downloadSize: () => '100MB',
    draw,
    error: () => null,
    output: () => '세 카드의 해석',
    progress: () => null,
    question: () => '',
    retry: vi.fn(),
    setCount: vi.fn(),
    setQuestion: vi.fn(),
    setShowCardsUpright: vi.fn(),
    showCardsUpright: () => true,
    startDownload: startTextDownload,
    status: readingStatus,
  }
  const requestVoice = vi.fn(() => setSpeechStatus('consent'))
  const cancelVoiceDownload = vi.fn(() => setSpeechStatus('idle'))
  const cancelVoiceConsent = vi.fn(() => setSpeechStatus('idle'))
  const startVoiceDownload = vi.fn(() => {
    setSpeechStatus('downloading')
    return Promise.resolve()
  })
  const speech: TarotSpeechController = {
    audioUrl: () => null,
    autoplay: () => false,
    autoRead: () => false,
    cancelDownload: cancelVoiceDownload,
    cancelDownloadConsent: cancelVoiceConsent,
    downloadSize: () => '200MB',
    error: () => null,
    onPlaybackEnd: vi.fn(),
    onPlaybackError: vi.fn(),
    onPlaybackRequest: () => true,
    onPlaybackStart: vi.fn(),
    paused: () => false,
    progress: () => (speechStatus() === 'downloading' ? 38 : null),
    request: requestVoice,
    setAutoRead: vi.fn(),
    startDownload: startVoiceDownload,
    status: speechStatus,
  }

  render(() => <Tarot locale="ko" reading={reading} speech={speech} />)

  const drawButton = screen.getByRole('button', {name: '다시 뽑기'})
  fireEvent.click(screen.getByRole('button', {name: '해석 음성 재생'}))
  expect(requestVoice).toHaveBeenCalledOnce()

  const consent = screen.getByRole('dialog')
  expect(consent).toHaveTextContent('해석 음성 재생')
  expect(drawButton).toBeDisabled()
  fireEvent.click(drawButton)
  expect(draw).not.toHaveBeenCalled()

  fireEvent.click(within(consent).getByRole('button', {name: '취소'}))
  expect(cancelVoiceConsent).toHaveBeenCalledOnce()
  expect(consent).toHaveAttribute('data-closed')
  expect(drawButton).toBeEnabled()

  fireEvent.click(screen.getByRole('button', {name: '해석 음성 재생'}))
  expect(requestVoice).toHaveBeenCalledTimes(2)
  expect(consent).not.toHaveAttribute('data-closed')
  expect(drawButton).toBeDisabled()

  fireEvent.keyDown(consent, {key: 'Escape'})
  expect(cancelVoiceConsent).toHaveBeenCalledTimes(2)
  expect(consent).toHaveAttribute('data-closed')
  expect(drawButton).toBeEnabled()

  fireEvent.click(screen.getByRole('button', {name: '해석 음성 재생'}))
  expect(requestVoice).toHaveBeenCalledTimes(3)
  expect(consent).not.toHaveAttribute('data-closed')

  fireEvent.click(within(consent).getByRole('button', {name: '받고 시작'}))
  expect(startVoiceDownload).toHaveBeenCalledOnce()
  expect(startTextDownload).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toHaveAttribute('data-closed')
  expect(screen.getByRole('status')).toHaveTextContent('음성 모델 다운로드 중 · 38%')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '38')
  expect(drawButton).toBeEnabled()

  fireEvent.click(drawButton)
  expect(draw).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: '다운로드 취소'}))
  expect(cancelVoiceDownload).toHaveBeenCalledOnce()
  expect(cancelTextDownload).not.toHaveBeenCalled()
})
