import {createUnoCssInlineResolver} from '@winter-love/unocss-config'
import UnoCSS from 'unocss/vite'
import type {Plugin} from 'vite'

const BUILD_UNO_CSS_ENTRY_ID = '\0pomo-build-uno.css'

type UnoCssPlugins = ReturnType<typeof UnoCSS>

// Vite 8 + SolidStart SSR이 virtual:uno.css를 /__uno.css?inline 파일 ID로 취급해 거부한다.
// UnoCSS 권장 설정이 아니라 그 버그의 로컬 패치다.
// https://github.com/unocss/unocss/issues/5271
// https://github.com/solidjs/solid-start/issues/2292
export const scopeUnoCssToClient = (plugins: UnoCssPlugins): UnoCssPlugins =>
  plugins.map((plugin) => ({
    ...plugin,
    applyToEnvironment(environment) {
      if (environment.config.command === 'build' && environment.config.consumer !== 'client') {
        return false
      }

      return plugin.applyToEnvironment?.call(this, environment) ?? true
    },
  }))

// 같은 로컬 패치. 빌드에서 virtual:uno.css import를 빈 모듈로 바꾼다.
const resolveBuildUnoCss = {
  apply: 'build' as const,
  enforce: 'pre' as const,
  load(id: string) {
    if (id === BUILD_UNO_CSS_ENTRY_ID) {
      return ''
    }
  },
  name: 'resolve-build-uno-css',
  resolveId(id: string) {
    if (id === 'virtual:uno.css') {
      return BUILD_UNO_CSS_ENTRY_ID
    }
  },
} satisfies Plugin

/** Creates the ordered UnoCSS plugin group required by the Pomo Vite build. */
export const createUnoCssPlugins = () => [
  createUnoCssInlineResolver(),
  resolveBuildUnoCss,
  ...scopeUnoCssToClient(UnoCSS({mode: 'dist-chunk'})),
]
