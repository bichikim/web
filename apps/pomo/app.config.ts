import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const focusRoomSourcePattern = /[/\\]assets[/\\]focus-room-source[/\\]/u
const focusRoomSourceGlob = 'focus-room-source/**'

const excludeFocusRoomSourceAssets = {
  enforce: 'pre' as const,
  name: 'exclude-focus-room-source-assets',
  resolveId(source: string, importer: string | undefined) {
    if (focusRoomSourcePattern.test(source)) {
      throw new Error(
        `Archived focus room source assets cannot be bundled: ${source} (imported by ${importer ?? 'unknown'})`,
      )
    }
  },
}

const app = defineConfig({
  server: isAppsInToss
    ? {
        prerender: {
          routes: [
            '/',
            '/character',
            '/chat',
            '/dialogue',
            '/focus-room',
            '/focus-room-dialogue',
            '/focus-room-layer-review',
            '/speech-to-text',
            '/terms',
            '/voice',
          ],
        },
        preset: 'static',
      }
    : {},
  ssr: true,
  vite: {
    optimizeDeps: {
      include: ['onnxruntime-web/all', 'zod'],
    },
    plugins: [excludeFocusRoomSourceAssets, UnoCSS()],
  },
})

const excludeFocusRoomSourceFromServerAssets = ({nitro}: {nitro: {options: NitroOptions}}) => {
  const sourceAsset = nitro.options.serverAssets.find(
    ({baseName, dir}) => baseName === 'server' && dir.endsWith('/assets'),
  )

  if (sourceAsset && !sourceAsset.ignore?.includes(focusRoomSourceGlob)) {
    sourceAsset.ignore = [...(sourceAsset.ignore ?? []), focusRoomSourceGlob]
  }
}

interface NitroOptions {
  readonly serverAssets: Array<{
    readonly baseName: string
    readonly dir: string
    ignore?: string[]
  }>
}

app.hooks.hook('app:build:nitro:config', excludeFocusRoomSourceFromServerAssets)
app.hooks.hook('app:dev:nitro:config', excludeFocusRoomSourceFromServerAssets)

export default app
