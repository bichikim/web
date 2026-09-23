/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'
import {
  type BackgroundController,
  type BackgroundPreferences,
  DEFAULT_BACKGROUND,
} from 'src/features/background'
import {Background} from '../Background'
import {Scene} from '../Scene'
import {Style} from '../Style'
import {Weather} from '../Weather'

vi.mock('../Scene', () => ({Scene: vi.fn()}))
vi.mock('../Style', () => ({Style: vi.fn()}))
vi.mock('../Weather', () => ({Weather: vi.fn()}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Scene).mockImplementation(() => <div>character scene controls</div>)
  vi.mocked(Style).mockImplementation(() => <div>character style controls</div>)
  vi.mocked(Weather).mockImplementation(() => <div>window weather controls</div>)
})

it('should switch between character controls and frame media settings', () => {
  const [preferences, setPreferences] = createSignal<BackgroundPreferences>(DEFAULT_BACKGROUND)
  const background: BackgroundController = {
    add: vi.fn(),
    busy: () => false,
    configure: vi.fn(async (patch) => {
      setPreferences((value) => ({...value, ...patch}))
    }),
    error: () => null,
    failedIds: () => [],
    items: () => [],
    load: vi.fn(),
    markFailed: vi.fn(),
    pick: vi.fn(),
    preferences,
    ready: () => true,
    remove: vi.fn(),
    retry: vi.fn(),
  }
  render(() => <Background background={background} />)
  expect(screen.getByText('character scene controls')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', {name: '액자'}))
  expect(screen.queryByText('character scene controls')).not.toBeInTheDocument()
  expect(screen.queryByText('window weather controls')).not.toBeInTheDocument()
  expect(screen.getByText('보여줄 사진 또는 동영상이 없어요')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', {name: '랜덤'}))
  expect(preferences().order).toBe('random')
  fireEvent.click(screen.getByRole('switch', {name: '최대 2장 함께 보기'}))
  expect(preferences().pairPhotos).toBe(true)
  const input = screen.getByLabelText('사진 및 동영상 추가', {selector: 'input'})
  const file = new File(['media'], 'photo.png', {type: 'image/png'})
  fireEvent.change(input, {target: {files: [file]}})
  expect(background.add).toHaveBeenCalledWith([file])
  fireEvent.click(screen.getByRole('radio', {name: '캐릭터'}))
  expect(screen.getByText('window weather controls')).toBeInTheDocument()
})
