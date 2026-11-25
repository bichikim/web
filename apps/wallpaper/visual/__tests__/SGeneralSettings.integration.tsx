import {cleanup, render} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {SGeneralSettings} from '../../src/components/SGeneralSettings'
import {createDictationPreferences} from '../../src/features/dictation/preferences'
import 'virtual:uno.css'

vi.mock('../../src/features/dictation/preferences', async () => {
  const actual = await vi.importActual<typeof import('../../src/features/dictation/preferences')>(
    '../../src/features/dictation/preferences',
  )
  return {...actual, createDictationPreferences: vi.fn()}
})
const databases: string[] = []
const connections: (() => void)[] = []
afterEach(async () => {
  cleanup()
  vi.resetAllMocks()
  connections.splice(0).forEach((close) => close())
  await Promise.all(databases.splice(0).map((name) => Dexie.delete(name)))
})

test.each([
  {model: 'qwen3-asr-1.7b', vad: true},
  {model: 'qwen3-asr-0.6b', vad: false},
])(
  'should replace stored $model with BuzzASR and preserve Silero $vad when reopened',
  async (stored) => {
    const actual = await vi.importActual<typeof import('../../src/features/dictation/preferences')>(
      '../../src/features/dictation/preferences',
    )
    const name = `settings-browser-${crypto.randomUUID()}`
    databases.push(name)
    const previous = new Dexie(name)
    previous.version(1).stores({preferences: ''})
    await previous.table('preferences').put(stored, 'input')
    previous.close()
    vi.mocked(createDictationPreferences).mockImplementation(() =>
      actual.createDictationPreferences(name),
    )
    const repository = actual.createDictationPreferences(name)
    connections.push(repository.close)
    render(() => (
      <div class="w-100 p-5 font-sans">
        <SGeneralSettings />
      </div>
    ))
    const model = page.getByRole('combobox', {name: '음성 인식 모델'})
    await expect.element(model).toHaveAttribute('aria-disabled', 'false')
    await expect.element(model).toHaveTextContent('BuzzASR/korean')
    const vad = page.getByRole('switch', {name: 'Silero VAD'})
    await expect.element(vad).toHaveAttribute('aria-checked', String(stored.vad))
    await model.click()
    await expect
      .element(page.getByRole('option', {name: 'BuzzASR/korean · Q8 · 1.66GB'}))
      .toBeVisible()
    expect(page.getByRole('option').all()).toHaveLength(1)
    await page.getByRole('option', {name: 'BuzzASR/korean · Q8 · 1.66GB'}).click()
    await expect
      .poll(() => repository.read())
      .toEqual({model: 'buzzasr-korean-q8', vad: stored.vad})
    await expect.element(vad).toBeEnabled()
    await vad.click()
    await expect
      .poll(() => repository.read())
      .toEqual({model: 'buzzasr-korean-q8', vad: !stored.vad})
    cleanup()
    render(() => (
      <div class="w-100 p-5 font-sans">
        <SGeneralSettings />
      </div>
    ))
    await expect
      .element(page.getByRole('combobox', {name: '음성 인식 모델'}))
      .toHaveTextContent('BuzzASR/korean')
    await expect
      .element(page.getByRole('switch', {name: 'Silero VAD'}))
      .toHaveAttribute('aria-checked', String(!stored.vad))
    await page
      .getByRole('region', {name: '음성 입력 설정'})
      .screenshot({path: '__screenshots__/dictation-settings.png'})
    repository.close()
  },
)
