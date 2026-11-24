import {clickSettings, settleSettings} from '../fixtures/settings'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import type {WallpaperController} from '../../src/features/settings'
import type {WallpaperLibraryController} from '../../src/features/library'
import {SAMPLE_PUPPET_ID} from '../../src/features/background/constants'
import {builtinConnectionProfile} from '../../src/features/connection-profiles/builtin-profile'
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

const selectCategory = async (name: string) => {
  await clickSettings(screen.getByRole('combobox', {name: '위젯 편집 항목'}))
  await clickSettings(screen.getByRole('option', {exact: true, name}))
  await settleSettings()
  const regions: Readonly<Record<string, string>> = {
    기본: '위젯 기본 설정',
    대화·음성: '대화·음성 설정',
    말풍선: '위젯 말풍선 설정',
    시선: '시선 보정 설정',
    터치: '캐릭터 터치',
    행동: '위젯 행동 설정',
  }
  await expect.poll(() => screen.queryByRole('region', {name: regions[name]})).not.toBeNull()
  const preview = screen.queryByRole('button', {name: '미리보기 창 열기'})
  if (preview !== null) {
    await clickSettings(preview)
  }
}

it.each([320, 496])('should drive selected chat state ON/OFF at %spx', async (width) => {
  const [widget, setWidget] = createSignal<PoffoWidget>({
    assetId: SAMPLE_PUPPET_ID,
    id: 'agent-widget',
    motionId: null,
    speech: {
      enabled: true,
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
    configureSpeech: vi.fn(async (_id, speech) => setWidget((previous) => ({...previous, speech}))),
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
  await selectCategory('행동')
  await clickSettings(screen.getByRole('button', {exact: true, name: '작업 상태 연결'}))
  await clickSettings(screen.getByRole('button', {name: '작업 중 편집'}))
  expect(screen.getByRole('button', {name: '작업 상태 연결 목록으로'})).toBeVisible()
  const target = screen.getByRole('combobox', {name: '작업 중 상태 파라미터'})
  expect(target).toBeVisible()
  await expect.poll(() => target.getAttribute('aria-disabled')).not.toBe('true')
  await clickSettings(target)
  await clickSettings(screen.getByRole('option', {name: 'Angle X'}))
  expect(playerModule.preparePuppetDocument).toHaveBeenCalledTimes(2)
  expect(widget().speech?.voice).toEqual(DEFAULT_POFFO_VOICE)
  expect(widget().speech?.lipsync?.source).toBe('off')
  const send = (detail: unknown) =>
    globalThis.dispatchEvent(new CustomEvent('poffo-agent-state:agent-widget', {detail}))
  send({working: true})
  await expect.poll(() => player.getParameterValue('angle-x')).toBe(30)
  expect(screen.getByLabelText('작업 중 상태')).toHaveTextContent('ON')
  send({})
  await expect.poll(() => player.getParameterValue('angle-x')).toBe(0)
  const region = screen.getByRole('region', {name: '작업 상태 연결'})
  expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
  await page
    .getByRole('region', {name: '작업 상태 연결'})
    .screenshot({path: `__screenshots__/state-connections-${width}.png`})
  const canvas = screen
    .getByRole('figure', {hidden: true, name: 'Poffo 위젯 미리보기'})
    .querySelector('canvas')
  await selectCategory('시선')
  await clickSettings(screen.getByRole('button', {exact: true, name: '눈동자'}))
  send({working: true})
  await expect.poll(() => player.getParameterValue('angle-x')).toBe(30)
  expect(
    screen.getByRole('figure', {hidden: true, name: 'Poffo 위젯 미리보기'}).querySelector('canvas'),
  ).toBe(canvas)
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
})

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
    const canvas = screen
      .getByRole('figure', {hidden: true, name: 'Poffo 위젯 미리보기'})
      .querySelector('canvas')
    await selectCategory('대화·음성')
    expect(screen.getByRole('spinbutton', {name: '립싱크 움직임 배율'})).toHaveValue('1.5')
    await clickSettings(screen.getByRole('combobox', {name: '립싱크 입력'}))
    await clickSettings(screen.getByRole('option', {name: '음성'}))
    const parameter = screen.getByRole('combobox', {name: '아 입모양 파라미터'})
    await expect.poll(() => parameter.getAttribute('aria-disabled')).not.toBe('true')
    await clickSettings(parameter)
    await clickSettings(screen.getByRole('option', {name: 'Angle X'}))
    const publish = createLipSyncPublisher('lipsync-widget')
    publish('voice', 0.6, 'a')
    await expect.poll(() => player.getParameterValue('angle-x')).toBeCloseTo(27)
    createLipSyncPublisher('different-widget')('voice', 1, 'a')
    expect(player.getParameterValue('angle-x')).toBeCloseTo(27)
    publish('voice', 0)
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(0)
    await clickSettings(screen.getByRole('combobox', {name: '립싱크 입력'}))
    await clickSettings(screen.getByRole('option', {name: '말풍선'}))
    setMessage({chat: 'chat', id: 'message', text: '아아아아아아아아아아아아아아아아아아아아'})
    await expect.poll(() => player.getParameterValue('angle-x')).toBeGreaterThan(1)
    setWidget((previous) => ({...previous, speech: {...previous.speech!, enabled: false}}))
    await expect.poll(() => player.getParameterValue('angle-x')).toBe(0)
    expect(
      screen
        .getByRole('figure', {hidden: true, name: 'Poffo 위젯 미리보기'})
        .querySelector('canvas'),
    ).toBe(canvas)
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
        randomActions: {enabled: true, probability: 0.5},
        semanticBindings: builtinConnectionProfile('builtin:ash')!.connections.semanticBindings,
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
    const menu = screen.getByRole('button', {name: '위젯 설정 관리'})
    expect(screen.queryByRole('button', {name: '설정 JSON 저장'})).toBeNull()
    await selectCategory('시선')
    expect(screen.queryByRole('button', {name: '말풍선 위치 조정'})).not.toBeInTheDocument()
    expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).not.toBeInTheDocument()
    const selectSection = async (name: string) => {
      const select = screen.queryByRole('combobox', {name: '보정 항목'})
      if (select === null) {
        await clickSettings(screen.getByRole('button', {exact: true, name}))
      } else {
        await clickSettings(select)
        await clickSettings(screen.getByRole('option', {exact: true, name}))
        await settleSettings()
      }
      expect(screen.getByRole('combobox', {name: '트래킹 입력'})).toBeInTheDocument()
      expect(screen.getByRole('button', {name: '위젯 설정 관리'})).toBe(menu)
      expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
      expect(preview.querySelector('canvas')).toBe(canvas)
    }
    await selectSection('머리')
    await selectSection('눈동자')
    await selectSection('연결')
    await selectCategory('말풍선')
    expect(screen.queryByRole('switch', {name: '말풍선 읽어주기'})).toBeNull()
    await selectCategory('대화·음성')
    expect(screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})).toBe(preview)
    expect(screen.getByRole('switch', {name: '말풍선 읽어주기'})).toBeInTheDocument()
    expect(screen.getByRole('combobox', {name: '음성 모델'})).toHaveTextContent('Full')
    expect(screen.getByRole('combobox', {name: '목소리'})).toHaveTextContent('Hana')
    expect(screen.getByRole('button', {name: '위젯 설정 관리'})).toBe(menu)
    expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
    await clickSettings(menu)
    expect(screen.getByRole('dialog', {name: '위젯 설정 관리'})).toBeVisible()
    expect(screen.getByRole('button', {name: '설정 JSON 저장'})).toBeVisible()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', {name: '위젯 설정 관리'})).toBeNull()
    await selectCategory('행동')
    await clickSettings(screen.getByRole('button', {exact: true, name: '행동 연결'}))
    expect(screen.getByRole('region', {name: '행동 연결'})).toBeInTheDocument()
    expect(screen.queryByRole('region', {name: '위젯 말풍선 설정'})).toBeNull()
    expect(screen.queryByRole('group', {name: /^연결 \d+$/})).toBeNull()
    const list = screen.getByRole('region', {name: '행동 연결 목록'})
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)
    await clickSettings(within(list).getAllByRole('button')[0]!)
    expect(screen.getAllByRole('group', {name: /^연결 \d+$/})).toHaveLength(1)
    await clickSettings(screen.getByRole('button', {name: '행동 연결 목록으로'}))
    await clickSettings(screen.getByRole('combobox', {name: '행동 설정 항목'}))
    await clickSettings(screen.getByRole('option', {exact: true, name: '랜덤 행동'}))
    expect(screen.getByRole('switch', {name: '랜덤 행동 사용'})).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', {name: '랜덤 행동 확률'})).toHaveValue('50')
    expect(screen.queryByRole('region', {name: '행동 연결'})).toBeNull()
    expect(mounted.container.firstElementChild!.scrollWidth).toBeLessThanOrEqual(width)
    expect(
      within(screen.getByRole('region', {name: '감정·내용 미매칭 랜덤 행동'})).queryAllByRole(
        'checkbox',
      ),
    ).toHaveLength(0)
    await selectCategory('기본')
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
