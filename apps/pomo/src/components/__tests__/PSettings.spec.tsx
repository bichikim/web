/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {PSwitch, type PSwitchProps} from 'src/components/PSwitch'
import {PSettings} from '../PSettings'

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('src/components/PModal', () => ({PModal: vi.fn()}))
vi.mock('src/components/PRadioSwitch', () => ({PRadioSwitch: vi.fn()}))
vi.mock('src/components/PSelect', () => ({PSelect: vi.fn()}))
vi.mock('src/components/PSwitch', () => ({PSwitch: vi.fn()}))
vi.mock('../PCreditsSettings', () => ({PCreditsSettings: vi.fn()}))
vi.mock('../PDialogueSettings', () => ({PDialogueSettings: vi.fn()}))
vi.mock('../PFeedSettings', () => ({PFeedSettings: vi.fn()}))
vi.mock('../PWeatherSettings', () => ({PWeatherSettings: vi.fn()}))
vi.mock('../../features/user-auth/UserSettings', () => ({UserSettings: vi.fn()}))

interface TabsRootProps {
  readonly children?: JSX.Element
  readonly value?: string
}

let tabsRootProps: TabsRootProps | undefined

beforeEach(() => {
  vi.clearAllMocks()
  tabsRootProps = undefined
  Object.assign(Tabs, {
    Content: (props: {children: JSX.Element}) => <>{props.children}</>,
    List: (props: {children: JSX.Element}) => <>{props.children}</>,
    Trigger: (props: {children: JSX.Element}) => (
      <button role="tab" type="button">
        {props.children}
      </button>
    ),
  })
  vi.mocked(Tabs).mockImplementation((props: TabsRootProps) => {
    tabsRootProps = props
    return <>{props.children}</>
  })
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
      {props.navigation}
      {props.children}
    </div>
  ))
})

it('should expose the guide and credits as the final settings tabs', () => {
  render(() => <PSettings />)

  expect(screen.queryByRole('button', {name: 'Pomofi 설명서'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '설정 열기'}))

  expect(screen.getByRole('dialog', {name: 'Pomofi 설정'}).hasAttribute('hidden')).toBe(false)
  expect(tabsRootProps?.value).toBe('general')
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '일반',
    '이벤트',
    '피드',
    '대화',
    '사용자',
    '설명서',
    '크레딧',
  ])
  expect(screen.queryByRole('tab', {name: '날씨'})).toBeNull()
})

it('should map the scribble style switch to the scene style value', () => {
  const onSceneStyleChange = vi.fn()

  render(() => <PSettings onSceneStyleChange={onSceneStyleChange} sceneStyle="scribble" />)

  const settingsTrigger = screen.getByRole('button', {name: '설정 열기'})

  expect(settingsTrigger.parentElement?.classList).toContain('pomo-scribble-circle-control')
  expect(
    settingsTrigger.parentElement?.querySelector('.pomo-scribble-circle-border'),
  ).not.toBeNull()
  expect(settingsTrigger.querySelector('.i-pomo-scribble\\:settings')).not.toBeNull()

  const styleSwitch = vi
    .mocked(PSwitch)
    .mock.calls.map(([props]) => props as PSwitchProps)
    .find((props) => props.label === '하찮은 스타일')

  expect(styleSwitch).toMatchObject({
    checked: true,
    description: expect.any(String),
    label: '하찮은 스타일',
  })

  styleSwitch?.onChange(false)
  expect(onSceneStyleChange).toHaveBeenLastCalledWith('original')

  styleSwitch?.onChange(true)
  expect(onSceneStyleChange).toHaveBeenLastCalledWith('scribble')
})
