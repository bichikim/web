import {clickSettings, settleSettings} from '../fixtures/settings'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {DEFAULT_POFFO_SPEECH, type PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import type {WallpaperController} from '../../src/features/settings'
import type {WallpaperLibraryController} from '../../src/features/library'
import {SAMPLE_PUPPET_ID} from '../../src/features/background/constants'
import {SSettingsNavigation} from '../../src/components/SSettingsNavigation'
import {SPoffoWidgetSettings} from '../../src/components/SPoffoWidgetSettings'
import 'virtual:uno.css'

afterEach(cleanup)

const select = async (label: string, name: string) => {
  await clickSettings(screen.getByRole('combobox', {name: label}))
  await clickSettings(screen.getByRole('option', {name}))
  await settleSettings()
}

it.each([400, 720])(
  'should navigate the complete widget path and sibling editors at %spx',
  async (width) => {
    await page.viewport(width, 560)
    const initial: PoffoWidget = {
      assetId: SAMPLE_PUPPET_ID,
      id: 'widget',
      speech: {
        ...DEFAULT_POFFO_SPEECH,
        semanticBindings: ['anger', 'happy'].map((name) => ({
          enabled: true,
          id: name,
          menuLabel: name,
          mode: 'toggle',
          parameterId: 'angle-x',
          text: name,
          threshold: 0.75,
        })),
        touch: {
          ...DEFAULT_POFFO_TOUCH,
          chains: ['숄더백', '꼬리', '왼팔', '오른팔', '앞머리', '옆머리'].map((name, index) => ({
            enabled: true,
            id: `chain-${index}`,
            joints: [0.25, 0.6, 1].map((response, index) => ({id: `joint-${index}`, response})),
            name,
          })),
          enabled: true,
          inverseKinematics: true,
          parameters: {'angle-x': {axis: 'x'}},
        },
      },
      tracking: 'off',
      x: null,
      y: null,
    }
    const [widgets, setWidgets] = createSignal<readonly PoffoWidget[]>([
      initial,
      {...initial, id: 'other-widget'},
    ])
    const controller = {
      busy: () => false,
      loadPuppet: vi.fn(),
      monitors: () => [],
      puppets: () => [{id: SAMPLE_PUPPET_ID, name: '애시'}],
    } as unknown as WallpaperController
    const configureSpeech = vi.fn(async (id: string, speech: PoffoWidget['speech']) =>
      setWidgets((previous) =>
        previous.map((widget) => (widget.id === id ? {...widget, speech} : widget)),
      ),
    )
    const library = {
      bindWidget: vi.fn(),
      configureSpeech,
      configureTracking: vi.fn(),
      setWidgetMotion: vi.fn(),
      trackWidget: vi.fn(),
      widgets,
    } as unknown as WallpaperLibraryController
    const view = render(() => (
      <SSettingsNavigation value="widget">
        {() => <SPoffoWidgetSettings controller={controller} library={library} />}
      </SSettingsNavigation>
    ))
    const click = async (name: string) => {
      await clickSettings(screen.getByRole('button', {exact: true, name}))
      await settleSettings()
    }
    await click('열린 위젯')
    expect(screen.queryByRole('button', {name: 'Poffo 파일 불러오기'})).toBeNull()
    await click('애시 · 위젯 1')
    const preview = screen.getByRole('figure', {name: 'Poffo 위젯 미리보기'})
    const canvas = preview.querySelector('canvas')
    expect(preview).toBeVisible()
    expect(screen.getByRole('navigation', {name: '위젯 편집 목록'})).toBeVisible()
    await click('기본')
    expect(preview).not.toBeVisible()
    expect(screen.getByRole('combobox', {name: '기본 애니메이션'})).toBeVisible()
    await click('미리보기 창 열기')
    const floating = screen.getByRole('dialog', {name: '미리보기'})
    expect(floating.matches(':popover-open')).toBe(true)
    expect(preview).toBeVisible()
    expect(screen.queryByRole('button', {name: '위젯 닫기'})).toBeNull()
    await select('위젯 편집 항목', '터치')
    expect(floating).toBeVisible()
    await clickSettings(within(floating).getByRole('button', {name: '미리보기 창 닫기'}))
    const search = screen.getByRole('searchbox', {name: '터치 목록 검색'})
    await userEvent.fill(search, '숄더백')
    const body = screen.getByRole('region', {name: '위젯 설정 내용'})
    const previousScroll = body.scrollTop
    await click('숄더백 편집')
    const path = screen.getByRole('navigation', {name: '위젯 설정 경로'})
    const header = path.closest('header')!
    expect(parseFloat(getComputedStyle(header).borderBottomWidth)).toBeGreaterThan(0)
    expect(within(path).getByRole('button', {name: '위젯 목록으로'})).toBeVisible()
    expect(within(path).getByRole('button', {name: '열린 위젯 목록으로'})).toBeVisible()
    await select('편집할 위젯', '애시 · 위젯 2')
    expect(within(path).getByRole('combobox', {name: '편집할 위젯'})).toHaveAccessibleDescription(
      '애시 · 위젯 2',
    )
    expect(
      within(path).getByRole('combobox', {name: '위젯 편집 항목'}),
    ).toHaveAccessibleDescription('터치')
    await select('편집할 위젯', '애시 · 위젯 1')
    expect(within(path).getByRole('combobox', {name: '터치 선택'})).toHaveTextContent('숄더백')
    const pathTop = path.getBoundingClientRect().top
    body.scrollTop = body.scrollHeight
    expect(path.getBoundingClientRect().top).toBe(pathTop)
    await click('터치 목록으로')
    expect(screen.getByRole('searchbox', {name: '터치 목록 검색'})).toBe(search)
    expect(search).toHaveValue('숄더백')
    expect(body.scrollTop).toBe(previousScroll)
    await userEvent.fill(search, '')
    await click('Angle X 편집')
    expect(within(path).getByRole('combobox', {name: '터치 선택'})).toHaveTextContent('Angle X')
    await select('터치 선택', '숄더백')
    expect(screen.getByRole('textbox', {name: '관절 연결 이름'})).toHaveValue('숄더백')
    expect(preview.querySelector('canvas')).toBe(canvas)
    expect(floating).not.toBeVisible()
    await select('위젯 편집 항목', '행동')
    await click('행동 연결')
    await click('anger 편집')
    expect(within(path).getByRole('combobox', {name: '행동 연결 선택'})).toHaveTextContent('anger')
    await select('행동 설정 항목', '작업 상태 연결')
    await click('작업 중 편집')
    expect(within(path).getByRole('combobox', {name: '작업 상태 연결 선택'})).toHaveTextContent(
      '작업 중',
    )
    expect(preview.querySelector('canvas')).toBe(canvas)
    expect(view.container.scrollWidth).toBeLessThanOrEqual(width)
    await page
      .getByRole('region', {exact: true, name: '위젯 설정'})
      .screenshot({path: `__screenshots__/widget-breadcrumbs-${width}.png`})
    await click('애시 · 위젯 1 목록으로')
    expect(screen.getByRole('navigation', {name: '위젯 편집 목록'})).toBeVisible()
    expect(preview).toBeVisible()
    await click('기본')
    expect(within(path).getByRole('combobox', {name: '위젯 편집 항목'})).toHaveTextContent('기본')
    expect(preview.querySelector('canvas')).toBe(canvas)
    await click('열린 위젯 목록으로')
    expect(screen.getByRole('navigation', {name: '열린 위젯 목록'})).toBeVisible()
    expect(floating).not.toBeVisible()
    await select('위젯 화면 선택', 'Poffo 불러오기')
    expect(screen.getByRole('region', {name: 'Poffo 불러오기'})).toBeVisible()
    expect(screen.getByRole('button', {name: 'Poffo 불러오기'})).toBeVisible()
    expect(configureSpeech).not.toHaveBeenCalled()
  },
)
