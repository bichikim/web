/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import aitDevtools from '@apps-in-toss/devtools/unplugin'
import {solidStart} from '@solidjs/start/config'
import {paraglideVitePlugin} from '@inlang/paraglide-js'
import {nitro} from 'nitro/vite'
import {createServerBoundaryPlugin} from '@winter-love/server-boundary'
import {createPolyfillsPlugin} from '../polyfills'
import {createDevFeedPlugin} from '../dev-feed/plugin'
import {createScribbleIconRestartPlugin} from '../scribble-icon/plugin'
import {createUnoCssPlugins} from '../uno-css/plugin'
import {createRemoteServerFunctionsPlugin} from '../remote-server-functions'
import {createMobileDevPlugin} from '../mobile-dev-plugin'
import {createPlugins, type CreatePluginsOptions} from '../create-plugins'

vi.mock('@apps-in-toss/devtools/unplugin', () => ({default: {vite: vi.fn()}}))
vi.mock('@solidjs/start/config', () => ({solidStart: vi.fn()}))
vi.mock('@inlang/paraglide-js', () => ({paraglideVitePlugin: vi.fn()}))
vi.mock('nitro/vite', () => ({nitro: vi.fn()}))
vi.mock('@winter-love/server-boundary', () => ({createServerBoundaryPlugin: vi.fn()}))
vi.mock('../polyfills', () => ({createPolyfillsPlugin: vi.fn()}))
vi.mock('../dev-feed/plugin', () => ({createDevFeedPlugin: vi.fn()}))
vi.mock('../scribble-icon/plugin', () => ({createScribbleIconRestartPlugin: vi.fn()}))
vi.mock('../uno-css/plugin', () => ({createUnoCssPlugins: vi.fn()}))
vi.mock('../remote-server-functions', () => ({createRemoteServerFunctionsPlugin: vi.fn()}))
vi.mock('../mobile-dev-plugin', () => ({createMobileDevPlugin: vi.fn()}))

const options = {
  buildTarget: 'web',
  command: 'serve',
  publicOrigin: 'https://pomo.example',
  runtimeTarget: 'web',
  scribbleIconPath: '/project/icons.json',
  usesAppsInTossDevtools: false,
} satisfies CreatePluginsOptions

beforeEach(() => {
  vi.mocked(aitDevtools.vite).mockReturnValue({name: 'toss-devtools'})
  vi.mocked(solidStart).mockReturnValue([{name: 'solid-start'}])
  vi.mocked(paraglideVitePlugin).mockReturnValue({name: 'paraglide'})
  vi.mocked(nitro).mockReturnValue([{name: 'nitro'}])
  vi.mocked(createServerBoundaryPlugin).mockReturnValue({name: 'boundary'})
  vi.mocked(createPolyfillsPlugin).mockResolvedValue({name: 'polyfills'})
  vi.mocked(createDevFeedPlugin).mockReturnValue({configureServer: vi.fn(), name: 'feeds'})
  vi.mocked(createScribbleIconRestartPlugin).mockReturnValue({name: 'icons'})
  vi.mocked(createUnoCssPlugins).mockReturnValue([{name: 'uno'}])
  vi.mocked(createRemoteServerFunctionsPlugin).mockReturnValue({name: 'remote-functions'})
  vi.mocked(createMobileDevPlugin).mockReturnValue({name: 'mobile'})
})

afterEach(() => vi.clearAllMocks())

it.each([
  {remote: false, ssr: true, target: 'web'},
  {remote: true, ssr: true, target: 'apps-in-toss'},
  {remote: true, ssr: false, target: 'desktop'},
  {remote: true, ssr: false, target: 'android'},
  {remote: true, ssr: false, target: 'ios'},
] as const)(
  'should compose the $target production plugins in order',
  async ({target, ssr, remote}) => {
    const plugins = createPlugins({
      ...options,
      buildTarget: target,
      command: 'build',
      runtimeTarget: target,
    })
    expect(solidStart).toHaveBeenCalledWith({
      devOverlay: false,
      middleware: remote ? './src/middleware/prerender.ts' : './src/middleware/index.ts',
      ssr,
    })
    expect(createRemoteServerFunctionsPlugin).toHaveBeenCalledTimes(remote ? 1 : 0)
    if (remote) {
      expect(createRemoteServerFunctionsPlugin).toHaveBeenCalledWith({
        publicOrigin: options.publicOrigin,
      })
    }
    expect((await Promise.all(plugins.flat())).flat()).toEqual([
      {name: 'mobile'},
      {name: 'polyfills'},
      {name: 'boundary'},
      {name: 'paraglide'},
      {name: 'uno'},
      ...(remote ? [{name: 'remote-functions'}] : []),
      {name: 'solid-start'},
      expect.objectContaining({name: 'feeds'}),
      {name: 'icons'},
      {name: 'nitro'},
      ...(remote ? [expect.objectContaining({name: 'static-nitro-entry'})] : []),
    ])
    expect(createScribbleIconRestartPlugin).toHaveBeenCalledWith({
      iconSetPath: options.scribbleIconPath,
    })
  },
)

it('should let SolidStart own desktop development server requests without Nitro', async () => {
  const plugins = createPlugins({...options, command: 'serve', runtimeTarget: 'desktop'})

  expect(createRemoteServerFunctionsPlugin).not.toHaveBeenCalled()
  expect(solidStart).toHaveBeenCalledWith({
    devOverlay: false,
    middleware: './src/middleware/index.ts',
    ssr: true,
  })
  expect(nitro).not.toHaveBeenCalled()
  expect((await Promise.all(plugins.flat())).flat()).toEqual([
    {name: 'mobile'},
    {name: 'polyfills'},
    {name: 'boundary'},
    {name: 'paraglide'},
    {name: 'uno'},
    {name: 'solid-start'},
    expect.objectContaining({name: 'feeds'}),
    {name: 'icons'},
  ])
})

it.each(['android', 'ios'] as const)(
  'should keep %s runtime development separate from a static build',
  (runtimeTarget) => {
    createPlugins({...options, runtimeTarget})
    expect(createMobileDevPlugin).toHaveBeenCalledWith(true)
    expect(createRemoteServerFunctionsPlugin).not.toHaveBeenCalled()
    expect(solidStart).toHaveBeenCalledWith({
      devOverlay: false,
      middleware: './src/middleware/index.ts',
      ssr: true,
    })
  },
)

it.each(['web', 'apps-in-toss', 'desktop', 'android', 'ios'] as const)(
  'should restrict Toss devtools and locale strategy to the %s runtime',
  (runtimeTarget) => {
    createPlugins({...options, runtimeTarget, usesAppsInTossDevtools: true})
    expect(aitDevtools.vite).toHaveBeenCalledTimes(runtimeTarget === 'apps-in-toss' ? 1 : 0)
    expect(paraglideVitePlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        outdir:
          runtimeTarget === 'apps-in-toss'
            ? './.i18n/paraglide/apps-in-toss'
            : './.i18n/paraglide/web',
        outputStructure: 'locale-modules',
        strategy:
          runtimeTarget === 'apps-in-toss'
            ? ['localStorage', 'cookie', 'baseLocale']
            : ['cookie', 'preferredLanguage', 'baseLocale'],
      }),
    )
  },
)

it('should use production message modules and leave optional devtools disabled', () => {
  createPlugins({...options, command: 'build', runtimeTarget: 'apps-in-toss'})
  expect(aitDevtools.vite).not.toHaveBeenCalled()
  expect(paraglideVitePlugin).toHaveBeenCalledWith(
    expect.objectContaining({
      outdir: './.i18n/paraglide',
      outputStructure: 'message-modules',
    }),
  )
})
