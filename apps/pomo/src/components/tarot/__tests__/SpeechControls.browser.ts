import '@unocss/reset/tailwind.css'
import {Tabs} from '@kobalte/core/tabs'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {commands, page} from 'vitest/browser'
import {setLocale} from '@paraglide/runtime'
import {PModal} from '../../p-modal/PModal'
import {type TarotSpeechController, useTarotSpeech} from '../../../features/tarot/use-tarot-speech'
import {useModelAssetManager, useModelDownload} from '../../../features/model-download'
import {createSupertonicClient} from '../../../features/supertonic/client'
import {
  createDialogueAudioPreview,
  generateDialogueAudio,
} from '../../../features/focus-room-dialogue/dialogue-audio-runtime'
import {SpeechControls} from '../SpeechControls'

vi.mock('../../../features/model-download', () => ({
  useModelAssetManager: vi.fn(),
  useModelDownload: vi.fn(),
}))
vi.mock('../../../features/supertonic/client', () => ({createSupertonicClient: vi.fn()}))
vi.mock('../../../features/focus-room-dialogue/dialogue-audio-runtime', () => ({
  createDialogueAudioPreview: vi.fn(),
  generateDialogueAudio: vi.fn(),
}))

const generated = {audioChunks: [], durationMs: 1000, sampleRate: 24000, segments: [], speed: 1.05}
declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
  }
}
let stylesheet: HTMLStyleElement | undefined
let speech: TarotSpeechController

beforeEach(async () => {
  await setLocale('en', {reload: false})
  vi.mocked(useModelAssetManager).mockReturnValue({
    runAfterModel: vi.fn(),
    runAfterVoiceModel: async (options) => ({status: 'complete', value: await options.task()}),
  })
  vi.mocked(useModelDownload).mockReturnValue({
    cancel: vi.fn(),
    dismissError: vi.fn(),
    dispose: vi.fn(),
    downloads: () => [],
    startImageModel: vi.fn(),
    startTextModel: vi.fn(),
    startVoiceModel: vi.fn(),
    state: () => ({status: 'idle'}),
  })
  vi.mocked(createSupertonicClient).mockReturnValue({
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn(),
    generateStream: vi.fn(),
    initialize: vi.fn().mockResolvedValue({ok: true, value: undefined}),
  })
  vi.mocked(generateDialogueAudio).mockResolvedValue({ok: true, value: generated})
  vi.mocked(createDialogueAudioPreview).mockResolvedValue(new Blob(['voice'], {type: 'audio/wav'}))
})
afterEach(async () => {
  cleanup()
  stylesheet?.remove()
  stylesheet = undefined
  vi.restoreAllMocks()
  vi.clearAllMocks()
  await setLocale('ko', {reload: false})
})

const mountReading = () =>
  render(() => {
    const [open, setOpen] = createSignal(false)
    const [tab, setTab] = createSignal('tarot')
    const [text, setText] = createSignal('')
    speech = useTarotSpeech({locale: () => 'en', text})
    speech.setAutoRead(true)
    const trigger = document.createElement('button')
    trigger.textContent = 'Open reading'
    trigger.onclick = () => setOpen(true)
    const complete = document.createElement('button')
    complete.textContent = 'Complete reading'
    complete.onclick = () => setText('A completed reading')
    return [
      trigger,
      createComponent(Tabs, {
        get children() {
          return createComponent(PModal, {
            get children() {
              return [
                createComponent(Tabs.Content, {
                  get children() {
                    return [complete, createComponent(SpeechControls, {speech})]
                  },
                  value: 'tarot',
                }),
                createComponent(Tabs.Content, {children: 'Other content', value: 'other'}),
              ]
            },
            get isOpen() {
              return open()
            },
            get navigation() {
              return createComponent(Tabs.List, {
                get children() {
                  return [
                    createComponent(Tabs.Trigger, {children: 'Tarot fixture', value: 'tarot'}),
                    createComponent(Tabs.Trigger, {children: 'Other fixture', value: 'other'}),
                  ]
                },
              })
            },
            onOpenChange: setOpen,
            title: 'Reading fixture',
          })
        },
        onChange: setTab,
        get value() {
          return tab()
        },
      }),
    ]
  })

const mockMedia = () => {
  const sources = new WeakMap<HTMLMediaElement, string>()
  const playing = new WeakSet<HTMLMediaElement>()
  const {setAttribute} = HTMLMediaElement.prototype
  vi.spyOn(HTMLMediaElement.prototype, 'setAttribute').mockImplementation(
    function setMediaAttribute(this: HTMLMediaElement, name, value) {
      if (name === 'src') {
        sources.set(this, value)
      } else {
        setAttribute.call(this, name, value)
      }
    },
  )
  vi.spyOn(HTMLMediaElement.prototype, 'src', 'set').mockImplementation(
    function setSource(this: HTMLMediaElement, source) {
      sources.set(this, source)
    },
  )
  vi.spyOn(HTMLMediaElement.prototype, 'src', 'get').mockImplementation(
    function getSource(this: HTMLMediaElement) {
      return sources.get(this) ?? ''
    },
  )
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(
    function isPaused(this: HTMLMediaElement) {
      return !playing.has(this)
    },
  )
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  const play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockImplementation(function play(this: HTMLMediaElement) {
      playing.add(this)
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
    function mediaState(this: HTMLMediaElement) {
      if (playing.delete(this)) {
        this.dispatchEvent(new Event('pause'))
      }
    },
  )
  return play
}

it.each(['modal', 'tab'] as const)(
  'should cancel pending autoplay on %s exit and reuse audio for manual play',
  async (exit) => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof generateDialogueAudio>>>()
    vi.mocked(generateDialogueAudio).mockReturnValue(pending.promise)
    const play = mockMedia()
    mountReading()
    await page.getByRole('button', {exact: true, name: 'Open reading'}).click()
    stylesheet = document.createElement('style')
    stylesheet.textContent = await commands.getUtilityStyles(document.body.outerHTML)
    document.head.append(stylesheet)
    await page.getByRole('button', {exact: true, name: 'Complete reading'}).click()
    await expect.poll(() => vi.mocked(generateDialogueAudio).mock.calls.length).toBe(1)
    expect(speech.status()).toBe('preparing')
    if (exit === 'modal') {
      await page.getByRole('button', {exact: true, name: 'Close'}).click()
      await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    } else {
      await page.getByRole('tab', {name: 'Other fixture'}).click()
      await expect
        .element(page.getByRole('button', {name: 'Complete reading'}))
        .not.toBeInTheDocument()
    }
    expect(speech.paused()).toBe(true)
    pending.resolve({ok: true, value: generated})
    await expect.poll(speech.status).toBe('ready')
    const retained = speech.audioUrl()
    expect(retained).toMatch(/^blob:/u)
    if (exit === 'modal') {
      await page.getByRole('button', {exact: true, name: 'Open reading'}).click()
    } else {
      await page.getByRole('tab', {name: 'Tarot fixture'}).click()
    }
    await expect.poll(() => document.querySelector('audio') !== null).toBe(true)
    expect(play).not.toHaveBeenCalled()
    await expect
      .element(page.getByRole('button', {exact: true, name: 'Play reading audio'}))
      .toBeVisible()
    expect(speech.autoplay()).toBe(false)
    expect(speech.audioUrl()).toBe(retained)
    expect(document.querySelector('audio')!.src).toBe(retained)
    await page.getByRole('button', {exact: true, name: 'Play reading audio'}).click()
    await expect.poll(() => speech.status()).toBe('playing')
    expect(play).toHaveBeenCalled()
    expect(play.mock.contexts.every((media) => media === document.querySelector('audio'))).toBe(
      true,
    )
    expect(generateDialogueAudio).toHaveBeenCalledOnce()
    expect(createDialogueAudioPreview).toHaveBeenCalledOnce()
  },
)
