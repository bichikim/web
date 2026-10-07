/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import type {PSceneStyle} from 'src/features/focus-room-animation'
import {PModal} from 'src/components/p-modal/PModal'
import {PSettingsContent} from '../../settings/Content'
import {useScreenWakeLock} from 'src/features/screen-wake-lock'
import {PSettings} from '../PSettings'

vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))
vi.mock('../../settings/Content', () => ({PSettingsContent: vi.fn()}))
vi.mock('src/features/screen-wake-lock', () => ({useScreenWakeLock: vi.fn()}))

beforeEach(() => {
  vi.mocked(useScreenWakeLock).mockReturnValue({
    availability: () => 'unsupported',
    errorMessage: () => null,
    isEnabled: () => false,
    isRequestPending: () => false,
    onEnabledChange: vi.fn(),
  })
  vi.mocked(PModal).mockImplementation((props) => (
    <div hidden={!props.isOpen}>{props.children}</div>
  ))
  vi.mocked(PSettingsContent).mockImplementation(() => {
    const [draft, setDraft] = createSignal('')
    return (
      <input
        aria-label="설정 초안"
        value={draft()}
        onInput={(event) => setDraft(event.currentTarget.value)}
      />
    )
  })
})

it.each(['trigger', 'window'] as const)(
  'should preserve focused settings drafts across live prop changes in the %s presentation',
  async (presentation) => {
    const [style, setStyle] = createSignal<PSceneStyle>('original')
    const onRequestClose = vi.fn()
    render(() => (
      <PSettings onRequestClose={onRequestClose} presentation={presentation} sceneStyle={style()} />
    ))
    if (presentation === 'trigger') {
      fireEvent.click(screen.getByRole('button', {name: '설정'}))
    }
    const input = await screen.findByRole('textbox', {name: '설정 초안'})
    fireEvent.input(input, {target: {value: 'unsaved'}})
    input.focus()
    setStyle('scribble')
    expect(screen.getByRole('textbox', {name: '설정 초안'})).toBe(input)
    expect(input).toHaveValue('unsaved')
    expect(document.activeElement).toBe(input)
    if (presentation === 'window') {
      fireEvent.click(screen.getByRole('button', {name: '닫기'}))
      expect(onRequestClose).toHaveBeenCalledOnce()
    }
  },
)
