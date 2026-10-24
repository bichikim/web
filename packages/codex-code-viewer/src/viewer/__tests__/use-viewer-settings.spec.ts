/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerSettingsEnvironment} from '../types'
import {useViewerSettings} from '../use-viewer-settings'
import {VIEWER_LANGUAGES} from '../locale/languages'

const createEnvironment = (language = 'en-US'): ViewerSettingsEnvironment => {
  const values = new Map<string, string>()
  return {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value)
      },
    },
    navigator: {language},
  }
}
afterEach(cleanup)
describe('useViewerSettings', () => {
  it('should default to English even when the browser uses Korean', () => {
    const hook = renderHook(() => useViewerSettings({environment: createEnvironment('ko-KR')}))
    expect(hook.result.preference()).toBe('en')
    expect(hook.result.language()).toBe('en')
  })
  it.each(VIEWER_LANGUAGES.map(({value}) => value))('should persist and restore %s', (language) => {
    const environment = createEnvironment('ko-KR')
    const hook = renderHook(() => useViewerSettings({environment}))
    hook.result.changeLanguage(language)
    expect(environment.localStorage?.getItem('codex-code-viewer.language')).toBe(language)
    const restored = renderHook(() => useViewerSettings({environment}))
    expect(restored.result.preference()).toBe(language)
    expect(restored.result.language()).toBe(language)
  })
  it.each([
    ['ja-JP', 'ja'],
    ['zh-Hans', 'zh-CN'],
    ['es-AR', 'es'],
    ['zh-TW', 'en'],
  ] as const)('should follow %s in Automatic mode', (locale, language) => {
    const environment = createEnvironment(locale)
    environment.localStorage?.setItem('codex-code-viewer.language', 'auto')
    const hook = renderHook(() => useViewerSettings({environment}))
    expect(hook.result.language()).toBe(language)
  })
  it('should follow host locale and resume following it after a manual override', () => {
    let receive: (locale: string | undefined) => void = () => {}
    const stop = vi.fn()
    const environment = createEnvironment('ko-KR')
    environment.localStorage?.setItem('codex-code-viewer.language', 'auto')
    const hook = renderHook(() =>
      useViewerSettings({
        environment,
        port: {
          subscribeLocale: (listener) => {
            receive = listener
            listener('ko-KR')
            return stop
          },
        },
      }),
    )
    expect(hook.result.language()).toBe('ko')
    expect(hook.result.preference()).toBe('auto')
    receive('en-US')
    expect(hook.result.language()).toBe('en')
    hook.result.changeLanguage('ko')
    receive('fr-FR')
    expect(hook.result.language()).toBe('ko')
    hook.result.changeLanguage('auto')
    expect(hook.result.language()).toBe('en')
    receive(undefined)
    expect(hook.result.language()).toBe('ko')
    hook.cleanup()
    expect(stop).toHaveBeenCalledOnce()
  })
  it('should restore the language override and use the supplied browser locale without a host value', () => {
    const environment = createEnvironment('ko-KR')
    environment.localStorage?.setItem('codex-code-viewer.language', 'auto')
    const hook = renderHook(() => useViewerSettings({environment}))
    expect(hook.result.language()).toBe('ko')
    hook.result.changeLanguage('en')
    const restored = renderHook(() => useViewerSettings({environment}))
    expect(restored.result.preference()).toBe('en')
    expect(restored.result.language()).toBe('en')
  })
  it('should use English for unsupported locales and ignore an invalid saved language', () => {
    const environment = createEnvironment('fr-FR')
    environment.localStorage?.setItem('codex-code-viewer.language', 'unexpected')
    const hook = renderHook(() => useViewerSettings({environment}))
    expect(hook.result.preference()).toBe('en')
    expect(hook.result.language()).toBe('en')
  })
  it('should default to two lines and restore a changed preference on the next mount', () => {
    const environment = createEnvironment()
    const hook = renderHook(() => useViewerSettings({environment}))
    expect(hook.result.previewLines()).toBe(2)
    hook.result.changePreviewLines(4)
    expect(hook.result.previewLines()).toBe(4)
    const restored = renderHook(() => useViewerSettings({environment}))
    expect(restored.result.previewLines()).toBe(4)
  })
  it('should keep preferences in the current session when accessing storage is denied', () => {
    const environment = createEnvironment()
    Object.defineProperty(environment, 'localStorage', {
      get: () => {
        throw new Error('Storage blocked')
      },
    })
    const hook = renderHook(() => useViewerSettings({environment}))
    expect(hook.result.previewLines()).toBe(2)
    expect(hook.result.preference()).toBe('en')
    hook.result.changePreviewLines(3)
    hook.result.changeLanguage('ko')
    expect(hook.result.previewLines()).toBe(3)
    expect(hook.result.language()).toBe('ko')
  })
  it('should keep preferences in the current session when storage writes fail', () => {
    const environment: ViewerSettingsEnvironment = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage full')
        },
      },
    }
    const hook = renderHook(() => useViewerSettings({environment}))
    hook.result.changePreviewLines(3)
    hook.result.changeLanguage('ko')
    expect(hook.result.previewLines()).toBe(3)
    expect(hook.result.language()).toBe('ko')
  })
  it('should retain defaults and accept session preferences when browser APIs are absent', () => {
    const hook = renderHook(() => useViewerSettings({environment: {}}))
    expect(hook.result.language()).toBe('en')
    expect(hook.result.previewLines()).toBe(2)
    hook.result.changeLanguage('ko')
    hook.result.changePreviewLines(3)
    expect(hook.result.language()).toBe('ko')
    expect(hook.result.previewLines()).toBe(3)
  })
  it.each(['100', '0', '1.5', 'invalid'])(
    'should ignore invalid persisted preview lines: %s',
    (value) => {
      const environment = createEnvironment()
      environment.localStorage?.setItem('codex-code-viewer.preview-lines', value)
      expect(renderHook(() => useViewerSettings({environment})).result.previewLines()).toBe(2)
    },
  )
  it.each([0, 1.5, 100, NaN])('should reject invalid preview line changes: %s', (value) => {
    const environment = createEnvironment()
    const hook = renderHook(() => useViewerSettings({environment}))
    hook.result.changePreviewLines(4)
    hook.result.changePreviewLines(value)
    expect(hook.result.previewLines()).toBe(4)
    expect(environment.localStorage?.getItem('codex-code-viewer.preview-lines')).toBe('4')
  })
})
