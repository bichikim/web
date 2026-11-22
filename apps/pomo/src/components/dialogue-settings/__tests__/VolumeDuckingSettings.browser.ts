import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {DialogueVolumeDuckingSettings} from '../VolumeDuckingSettings'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), setItem: vi.fn()},
}))

import {Storage} from '@apps-in-toss/web-framework'

const STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v2'
const DEBOUNCE_MILLISECONDS = 300
const PENDING_MILLISECONDS = 100
const FIRST_VOLUME = 35
const VOLUME_INCREASE = 5
const SAVE_FAILURE = '플레이어 음량 설정을 저장하지 못했어요.'
const LOAD_FAILURE = '플레이어 음량 설정을 불러오지 못했어요.'
const originalLocale = getLocale
const initial = {enabled: true, playerVolumePercent: 50, version: 2} as const
const releaseNativeWrites: VoidFunction[] = []
const deferNativeWrite = () => {
  const write = Promise.withResolvers<void>()
  releaseNativeWrites.push(write.resolve)
  return write
}
const mount = () => {
  const [open, setOpen] = createSignal(true)
  render(() =>
    createComponent(PreferenceProvider, {
      get children() {
        return createComponent(Show, {
          get children() {
            return createComponent(DialogueVolumeDuckingSettings, {})
          },
          keyed: true,
          get when() {
            return open()
          },
        })
      },
    }),
  )
  return setOpen
}

const holdFirstNativeWrite = () => {
  const first = deferNativeWrite()
  let nativeValue = JSON.stringify(initial)
  vi.mocked(Storage.getItem).mockImplementation(async () => nativeValue)
  vi.mocked(Storage.setItem).mockImplementation(async (_key, value) => {
    if (vi.mocked(Storage.setItem).mock.calls.length === 1) {
      await first.promise
    }
    nativeValue = value
  })
  return {first, read: () => JSON.parse(nativeValue)}
}

beforeEach(() => {
  localStorage.clear()
  overwriteGetLocale(() => 'ko')
  vi.stubGlobal('ReactNativeWebView', {})
  vi.mocked(Storage.getItem).mockReset().mockResolvedValue(JSON.stringify(initial))
  vi.mocked(Storage.setItem).mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
})

afterEach(async () => {
  cleanup()
  releaseNativeWrites.splice(0).forEach((release) => release())
  await vi.advanceTimersByTimeAsync(0)
  overwriteGetLocale(originalLocale)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it.each(['success', 'failure'] as const)(
  'should retain keyboard volume edits and persist the latest toggle after an older native %s',
  async (outcome) => {
    const native = holdFirstNativeWrite()
    mount()
    await vi.advanceTimersByTimeAsync(0)
    const slider = page.getByRole('slider', {name: '대화 중 플레이어 음량 비율'})
    const toggle = page.getByRole('switch', {name: '대화 중 플레이어 음량 낮춤'})
    await expect.element(slider).toBeEnabled()

    slider.element().focus()
    await userEvent.keyboard(`{Home}${'{ArrowRight}'.repeat(FIRST_VOLUME)}`)
    expect(slider.element()).toHaveValue('35')
    expect(page.getByText('35%', {exact: true}).element()).toBeVisible()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MILLISECONDS)
    expect(Storage.setItem).toHaveBeenCalledExactlyOnceWith(
      STORAGE_KEY,
      JSON.stringify({...initial, playerVolumePercent: 35}),
    )

    await userEvent.keyboard('{ArrowRight}'.repeat(VOLUME_INCREASE))
    expect(slider.element()).toHaveValue('40')
    await vi.advanceTimersByTimeAsync(PENDING_MILLISECONDS)
    if (outcome === 'success') {
      native.first.resolve()
    } else {
      native.first.reject(new Error('native storage unavailable'))
    }
    await vi.advanceTimersByTimeAsync(0)

    expect(slider.element()).toHaveValue('40')
    expect(page.getByText('40%', {exact: true}).element()).toBeVisible()
    expect(Storage.setItem).toHaveBeenCalledOnce()
    expect(page.getByText(SAVE_FAILURE).length).toBe(0)

    await page.getByText('대화 중 플레이어 음량 낮춤', {exact: true}).click()
    expect(toggle.element()).not.toBeChecked()
    expect(slider.element()).toBeDisabled()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MILLISECONDS)
    const latest = {...initial, enabled: false, playerVolumePercent: 40}
    expect(Storage.setItem).toHaveBeenCalledTimes(2)
    expect(native.read()).toEqual(latest)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(latest)
    expect(page.getByText(SAVE_FAILURE).length).toBe(0)
    expect(page.getByText('플레이어 음량 설정을 저장했어요.').length).toBe(0)

    cleanup()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MILLISECONDS)
    expect(Storage.setItem).toHaveBeenCalledTimes(2)
    mount()
    await expect.element(toggle).toBeEnabled()
    expect(slider.element()).toHaveValue('40')
    expect(toggle.element()).not.toBeChecked()
  },
)

it('should report the latest failed write when a storage refresh is waiting for it', async () => {
  const latest = deferNativeWrite()
  vi.mocked(Storage.setItem).mockReturnValueOnce(latest.promise)
  mount()
  const slider = page.getByRole('slider', {name: '대화 중 플레이어 음량 비율'})
  await vi.advanceTimersByTimeAsync(0)
  await expect.element(slider).toBeEnabled()

  slider.element().focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MILLISECONDS)
  expect(Storage.setItem).toHaveBeenCalledOnce()
  globalThis.dispatchEvent(
    new StorageEvent('storage', {key: STORAGE_KEY, storageArea: globalThis.localStorage}),
  )

  latest.reject(new Error('latest native storage write failed'))
  await vi.advanceTimersByTimeAsync(0)
  expect(slider.element()).toHaveValue(String(initial.playerVolumePercent))
  expect(page.getByText(SAVE_FAILURE).element()).toBeVisible()
})

it.each([
  {label: 'without reopening', reopen: false},
  {label: 'after reopening', reopen: true},
])(
  'should report only the latest failure and restore the previous save $label',
  async ({reopen}) => {
    const first = deferNativeWrite()
    const latest = deferNativeWrite()
    vi.mocked(Storage.setItem)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(latest.promise)
    const setOpen = mount()
    const slider = page.getByRole('slider', {name: '대화 중 플레이어 음량 비율'})
    await vi.advanceTimersByTimeAsync(0)
    await expect.element(slider).toBeEnabled()

    slider.element().focus()
    await userEvent.keyboard(`{Home}${'{ArrowRight}'.repeat(FIRST_VOLUME)}`)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MILLISECONDS)
    expect(Storage.setItem).toHaveBeenCalledOnce()

    if (reopen) {
      setOpen(false)
      await expect.element(slider).not.toBeInTheDocument()
      setOpen(true)
      await expect.element(slider).toBeEnabled()
    }
    expect(slider.element()).toHaveValue('35')
    slider.element().focus()
    await userEvent.keyboard('{ArrowRight}'.repeat(VOLUME_INCREASE))
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MILLISECONDS)
    expect(Storage.setItem).toHaveBeenCalledOnce()

    first.reject(new Error('older native storage write failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(Storage.setItem).toHaveBeenCalledTimes(2)
    expect(slider.element()).toHaveValue('40')
    expect(page.getByText(SAVE_FAILURE).length).toBe(0)
    expect(page.getByText(LOAD_FAILURE).length).toBe(0)

    latest.reject(new Error('latest native storage write failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(slider.element()).toHaveValue(String(initial.playerVolumePercent))
    expect(page.getByText(SAVE_FAILURE).element()).toBeVisible()
    expect(page.getByText(LOAD_FAILURE).length).toBe(0)
  },
)
