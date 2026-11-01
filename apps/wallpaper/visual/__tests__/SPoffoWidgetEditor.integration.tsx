import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import type {WallpaperController} from '../../src/features/settings'
import type {WallpaperLibraryController} from '../../src/features/library'
import {SAMPLE_PUPPET_ID} from '../../src/features/background/constants'
import {SPoffoWidgetEditor} from '../../src/components/SPoffoWidgetEditor'
import {createLipSyncPublisher, useSpeechLipSync} from '../../src/features/lipsync'
import type {VoiceMessage} from '../../src/features/voice/text'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const player = await importOriginal<typeof playerModule>()
  return {
    ...player,
    createPlayer: vi.fn(player.createPlayer),
    preparePuppetDocument: vi.fn(player.preparePuppetDocument),
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each([320, 496])(
  'should drive state ON/OFF independently of speech visibility at %spx',
  async (width) => {
    const [widget, setWidget] = createSignal<PoffoWidget>({
      assetId: SAMPLE_PUPPET_ID,
      id: 'agent-widget',
      motionId: null,
      speech: {
        enabled: false,
        lipsync: {source: 'off'},
        voice: DEFAULT_POFFO_VOICE,
        x: 0.9,
        y: 0.05,
      },
      tracking: 'off',
      x: null,
      y: null,
    })
    const library = {
      bindWidget: vi.fn(),
      configureSpeech: vi.fn(async (_id, speech) =>
        setWidget((previous) => ({...previous, speech})),
      ),
      configureTracking: vi.fn(),
      setWidgetMotion: vi.fn(),
      trackWidget: vi.fn(),
    } as unknown as WallpaperLibraryController
    const controller = {loadPuppet: vi.fn(), monitors: () => []} as unknown as WallpaperController
    const view = render(() => (
      <div
        class="box-border w-[var(--editor-width)] bg-white p-3"
        style={{'--editor-width': `${width}px`}}
      >
        <SPoffoWidgetEditor
          controller={controller}
          library={library}
          assetId={() => SAMPLE_PUPPET_ID}
          widget={widget()}
        />
      </div>
    ))
    await expect.poll(() => vi.mocked(playerModule.createPlayer).mock.results.length).toBe(1)
    const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
    screen.getByRole('radio', {name: '행동'}).focus()
    await userEvent.keyboard('{Space}')
    screen.getByRole('radio', {name: '작업 상태'}).focus()
    await userEvent.keyboard('{Space}')
    const target = screen.getByRole('combobox', {name: '작업 중 상태 파라미터'})
    await expect.poll(() => target.hasAttribute('disabled')).toBe(false)
    await userEvent.click(target)
    await userEvent.click(screen.getByRole('option', {name: 'Angle X'}))
    expect(playerModule.preparePuppetDocument).toHaveBeenCalledTimes(2)
    expect(widget().speech?.voice).toEqual(DEFAULT_POFFO_VOICE)
    expect(widget().speech?.lipsync?.source).toBe('off')
    const send = (detail: unknown) =>
      globalThis.dispatchEvent(new CustomEvent('poffo-agent-state', {detail}))
    send({working: true})
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(30)
    expect(screen.getByLabelText('작업 중 상태')).toHaveTextContent('ON')
    send({})
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(0)
    const region = screen.getByRole('region', {name: '에이전트 상태 연결'})
    expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
    const canvas = view.container.querySelector('canvas')
    screen.getByRole('radio', {name: '캐릭터'}).focus()
    await userEvent.keyboard('{Space}')
    screen.getByRole('radio', {name: '눈동자'}).focus()
    await userEvent.keyboard('{Space}')
    send({working: true})
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(30)
    expect(view.container.querySelector('canvas')).toBe(canvas)
    expect(playerModule.createPlayer).toHaveBeenCalledOnce()
  },
)

it.each([320, 496])(
  'should connect lip-sync inputs to the existing player and fit at %spx',
  async (width) => {
    const [widget, setWidget] = createSignal<PoffoWidget>({
      assetId: SAMPLE_PUPPET_ID,
      id: 'lipsync-widget',
      motionId: null,
      speech: {enabled: true, x: 0.9, y: 0.05},
      tracking: 'off',
      x: null,
      y: null,
    })
    const [message, setMessage] = createSignal<VoiceMessage | null>(null)
    const library = {
      bindWidget: vi.fn(),
      configureSpeech: vi.fn(async (_id, speech) =>
        setWidget((previous) => ({...previous, speech})),
      ),
      configureTracking: vi.fn(),
      setWidgetMotion: vi.fn(),
      trackWidget: vi.fn(),
    } as unknown as WallpaperLibraryController
    const controller = {loadPuppet: vi.fn(), monitors: () => []} as unknown as WallpaperController
    const view = render(() => {
      useSpeechLipSync({message, speech: () => widget().speech!, widgetId: () => widget().id})
      return (
        <div
          class="box-border w-[var(--editor-width)] bg-white p-3"
          style={{'--editor-width': `${width}px`}}
        >
          <SPoffoWidgetEditor
            controller={controller}
            library={library}
            assetId={() => SAMPLE_PUPPET_ID}
            widget={widget()}
          />
        </div>
      )
    })
    await expect.poll(() => vi.mocked(playerModule.createPlayer).mock.results.length).toBe(1)
    const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
    const canvas = view.container.querySelector('canvas')
    screen.getByRole('radio', {name: '말풍선·음성'}).focus()
    await userEvent.keyboard('{Space}')
    await userEvent.click(screen.getByRole('combobox', {name: '립싱크 입력'}))
    await userEvent.click(screen.getByRole('option', {name: '음성'}))
    const parameter = screen.getByRole('combobox', {name: '아 입모양 파라미터'})
    await expect.poll(() => parameter.getAttribute('aria-disabled')).not.toBe('true')
    await userEvent.click(parameter)
    await userEvent.click(screen.getByRole('option', {name: 'Angle X'}))
    const publish = createLipSyncPublisher('lipsync-widget')
    publish('voice', 0.6, 'a')
    await expect.poll(() => player.getParameterValue('angle-x')).toBeCloseTo(18)
    createLipSyncPublisher('different-widget')('voice', 1, 'a')
    expect(player.getParameterValue('angle-x')).toBeCloseTo(18)
    publish('voice', 0)
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(0)
    await userEvent.click(screen.getByRole('combobox', {name: '립싱크 입력'}))
    await userEvent.click(screen.getByRole('option', {name: '말풍선'}))
    setMessage({chat: 'chat', id: 'message', text: '아아아아아아아아아아아아아아아아아아아아'})
    await expect.poll(() => player.getParameterValue('angle-x')).toBeGreaterThan(1)
    setWidget((previous) => ({...previous, speech: {...previous.speech!, enabled: false}}))
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(0)
    expect(view.container.querySelector('canvas')).toBe(canvas)
    expect(playerModule.createPlayer).toHaveBeenCalledOnce()
    const region = screen.getByRole('region', {name: '립싱크 연결'})
    expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
  },
)

it.each([320, 496])(
  'should show character controls directly at %spx and preserve the player and speech preferences',
  async (width) => {
    const widget: PoffoWidget = {
      assetId: SAMPLE_PUPPET_ID,
      id: 'widget',
      speech: {
        enabled: true,
        voice: {...DEFAULT_POFFO_VOICE, model: 'full', voice: 'Hana'},
        x: 0.9,
        y: 0.05,
      },
      tracking: 'off',
      x: null,
      y: null,
    }
    const controller = {loadPuppet: vi.fn(), monitors: () => []} as unknown as WallpaperController
    const library = {
      bindWidget: vi.fn(),
      configureSpeech: vi.fn(),
      configureTracking: vi.fn(),
      setWidgetMotion: vi.fn(),
      trackWidget: vi.fn(),
    } as unknown as WallpaperLibraryController
    const mounted = render(() => (
      <div
        class="box-border w-[var(--editor-width)] bg-white p-3"
        style={{'--editor-width': `${width}px`}}
      >
        <SPoffoWidgetEditor
          controller={controller}
          library={library}
          assetId={() => SAMPLE_PUPPET_ID}
          widget={widget}
        />
      </div>
    ))
    const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
    await expect.poll(() => vi.mocked(playerModule.createPlayer).mock.calls.length).toBe(1)
    const canvas = preview.querySelector('canvas')
    const save = screen.getByRole('button', {name: '설정 JSON 저장'})
    expect(screen.getByRole('group', {name: '위젯 편집 항목'})).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: '말풍선 위치 조정'})).not.toBeInTheDocument()
    expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).not.toBeInTheDocument()
    const selectSection = async (name: string) => {
      screen.getByRole('radio', {name}).focus()
      await userEvent.keyboard('{Space}')
      expect(screen.getByRole('combobox', {name: '트래킹 입력'})).toBeInTheDocument()
      expect(screen.getByRole('button', {name: '설정 JSON 저장'})).toBe(save)
      expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
      expect(preview.querySelector('canvas')).toBe(canvas)
    }
    await selectSection('얼굴')
    await selectSection('눈동자')
    await selectSection('연결')
    screen.getByRole('radio', {name: '말풍선·음성'}).focus()
    await userEvent.keyboard('{Space}')
    expect(screen.queryByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBeNull()
    expect(screen.getByRole('switch', {name: '말풍선 읽어주기'})).toBeInTheDocument()
    expect(screen.getByRole('combobox', {name: '음성 모델'})).toHaveTextContent('Full')
    expect(screen.getByRole('combobox', {name: '목소리'})).toHaveTextContent('Hana')
    expect(screen.getByRole('button', {name: '설정 JSON 저장'})).toBe(save)
    expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
    screen.getByRole('radio', {name: '행동'}).focus()
    await userEvent.keyboard('{Space}')
    expect(screen.getByRole('region', {name: '감정·내용 연결'})).toBeInTheDocument()
    expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).toBeNull()
    screen.getByRole('radio', {name: '랜덤 행동'}).focus()
    await userEvent.keyboard('{Space}')
    expect(screen.queryByRole('region', {name: '감정·내용 연결'})).toBeNull()
    expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
    screen.getByRole('radio', {name: '캐릭터'}).focus()
    await userEvent.keyboard('{Space}')
    expect(preview.querySelector('canvas')).toBe(canvas)
    expect(playerModule.createPlayer).toHaveBeenCalledOnce()
    expect(library.configureSpeech).not.toHaveBeenCalled()
    expect(widget.speech).toMatchObject({
      enabled: true,
      voice: {model: 'full', voice: 'Hana'},
      x: 0.9,
      y: 0.05,
    })
  },
)
