import {clickSettings, settleSettings} from '../fixtures/settings'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal, Match, Switch} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {DEFAULT_POFFO_SPEECH, type PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import {HInterfaceLanguage} from '../../src/components/HInterfaceLanguage'
import {type SettingsPage, SSettingsNavigation} from '../../src/components/SSettingsNavigation'
import {SGeneralSettings} from '../../src/components/SGeneralSettings'
import {SPoffoWidgetSettings} from '../../src/components/SPoffoWidgetSettings'
import {SCodexSpeech} from '../../src/components/SCodexSpeech'
import type {CodexActivity} from '../../src/features/codex'
import {interfaceLanguage} from '../../src/features/localization'
import {SAMPLE_PUPPET_ID} from '../../src/features/background/constants'
import type {WallpaperController} from '../../src/features/settings'
import type {WallpaperLibraryController} from '../../src/features/library'
import 'virtual:uno.css'

afterEach(async () => {
  cleanup()
  await interfaceLanguage.change('ko')
  localStorage.removeItem('wallpaper.interface-language')
})

const select = async (label: string, option: string) => {
  await clickSettings(screen.getByRole('combobox', {name: label}))
  await clickSettings(screen.getByRole('option', {exact: true, name: option}))
  await settleSettings()
}

it('should translate bubble controls while retaining response text and a typed draft', async () => {
  await interfaceLanguage.change('ko')
  const [activity, setActivity] = createSignal<CodexActivity>({
    notificationId: 1,
    phase: 'working',
    receivedAt: 1,
    sessionId: 'chat',
    text: 'Codex가 작업하고 있어요.',
    title: '원래 채팅 제목',
    tool: 'Bash',
  })
  render(() => (
    <HInterfaceLanguage>
      <div class="w-68">
        <SCodexSpeech activity={activity()} voiceState="generating" onVoiceToggle={vi.fn()} />
      </div>
    </HInterfaceLanguage>
  ))
  await interfaceLanguage.change('en')
  expect(screen.getByText('Codex is working.')).toBeVisible()
  expect(screen.getByText('Working')).toBeVisible()
  expect(screen.getByRole('button', {name: 'Pause speech'})).toHaveAccessibleDescription(
    'Preparing speech',
  )
  setActivity((current) => ({
    ...current,
    phase: 'response',
    response: '이 답변은 원문 그대로 남아야 합니다.',
  }))
  const response = screen.getByRole('region', {name: '원래 채팅 제목 response'})
  expect(response).toHaveTextContent('이 답변은 원문 그대로 남아야 합니다.')
  const input = screen.getByRole('textbox', {name: 'Message to send to Codex'})
  await userEvent.fill(input, '보존할 초안 draft')
  await interfaceLanguage.change('ko')
  expect(screen.getByRole('textbox', {name: 'Codex에 보낼 메시지'})).toBe(input)
  expect(input).toHaveValue('보존할 초안 draft')
  expect(response).toHaveTextContent('이 답변은 원문 그대로 남아야 합니다.')
})

it.each([400, 720])(
  'should switch the settings shell live and preserve user data at %spx',
  async (width) => {
    await page.viewport(width, 900)
    await interfaceLanguage.change('ko')
    const [selected, setSelected] = createSignal<SettingsPage>('general')
    const widgets: readonly PoffoWidget[] = [
      {
        assetId: SAMPLE_PUPPET_ID,
        id: 'widget',
        speech: {
          ...DEFAULT_POFFO_SPEECH,
          lipsync: {gain: 3, source: 'voice'},
          touch: {
            ...DEFAULT_POFFO_TOUCH,
            chains: [{enabled: true, id: 'chain', joints: [], name: '사용자가 붙인 이름'}],
            enabled: true,
            inverseKinematics: true,
          },
        },
        tracking: 'off',
        x: null,
        y: null,
      },
    ]
    const controller = {
      busy: () => false,
      loadPuppet: vi.fn(),
      monitors: () => [],
      puppets: () => [{id: SAMPLE_PUPPET_ID, name: 'Ash'}],
    } as unknown as WallpaperController
    const library = {
      bindWidget: vi.fn(),
      configureSpeech: vi.fn(),
      configureTracking: vi.fn(),
      setWidgetMotion: vi.fn(),
      trackWidget: vi.fn(),
      widgets: () => widgets,
    } as unknown as WallpaperLibraryController
    const view = render(() => (
      <HInterfaceLanguage>
        <SSettingsNavigation value={selected()} onChange={setSelected}>
          {(current) => (
            <Switch>
              <Match when={current === 'general'}>
                <SGeneralSettings />
              </Match>
              <Match when={current === 'widget'}>
                <SPoffoWidgetSettings controller={controller} library={library} />
              </Match>
            </Switch>
          )}
        </SSettingsNavigation>
      </HInterfaceLanguage>
    ))
    await select('인터페이스 언어', 'English')
    await expect
      .poll(() => screen.queryByRole('combobox', {name: 'Interface language'}))
      .not.toBeNull()
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('wallpaper.interface-language')).toBe('en')
    expect(screen.getByText('Saved automatically')).toBeVisible()
    await select('Select settings page', 'Widgets')
    await clickSettings(screen.getByRole('button', {name: 'Open widgets'}))
    await clickSettings(screen.getByRole('button', {name: 'Ash · Widget 1'}))
    await settleSettings()
    await clickSettings(screen.getByRole('button', {exact: true, name: 'Basic'}))
    await settleSettings()
    const preview = screen.getByRole('figure', {hidden: true, name: 'Poffo widget preview'})
    const canvas = preview.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(screen.queryByRole('dialog', {name: 'Preview'})).toBeNull()
    await select('Widget settings category', 'Conversation and voice')
    await expect
      .poll(() => screen.queryByRole('region', {name: 'Conversation and voice settings'}))
      .not.toBeNull()
    expect(screen.getByRole('heading', {name: 'Read aloud'})).toBeVisible()
    expect(screen.getByRole('heading', {name: 'Lip sync'})).toBeVisible()
    const voice = screen.getByRole('combobox', {name: 'Voice service'}).getBoundingClientRect()
    for (const shape of ['A', 'I', 'U', 'E', 'O', 'Closed']) {
      const control = screen
        .getByRole('combobox', {name: `${shape} mouth-shape parameter`})
        .getBoundingClientRect()
      expect(control.left).toBe(voice.left)
      expect(control.right).toBe(voice.right)
    }
    await select('Widget settings category', 'Touch')
    await expect.poll(() => screen.queryByRole('region', {name: 'Character touch'})).not.toBeNull()
    expect(screen.getByRole('button', {name: 'Edit 사용자가 붙인 이름'})).toBeVisible()
    const header = screen.getByRole('navigation', {name: 'Widget settings path'})
    expect(
      within(header).getByRole('combobox', {name: 'Widget settings category'}),
    ).toHaveTextContent('Touch')
    localStorage.setItem('wallpaper.interface-language', 'ko')
    globalThis.dispatchEvent(
      new StorageEvent('storage', {key: 'wallpaper.interface-language', newValue: 'ko'}),
    )
    await expect.poll(() => document.documentElement.lang).toBe('ko')
    expect(screen.getByRole('combobox', {name: '위젯 편집 항목'})).toHaveTextContent('터치')
    expect(screen.getByRole('button', {name: '사용자가 붙인 이름 편집'})).toBeVisible()
    expect(preview.querySelector('canvas')).toBe(canvas)
    localStorage.setItem('wallpaper.interface-language', 'en')
    globalThis.dispatchEvent(
      new StorageEvent('storage', {key: 'wallpaper.interface-language', newValue: 'en'}),
    )
    await expect.poll(() => document.documentElement.lang).toBe('en')
    expect(view.container.scrollWidth).toBeLessThanOrEqual(width)
    await page
      .getByRole('region', {exact: true, name: 'Widgets settings'})
      .screenshot({path: `__screenshots__/english-widget-settings-${width}.png`})
  },
)
