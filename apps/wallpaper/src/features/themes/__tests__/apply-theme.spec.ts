import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {ThemeArchive} from '@winter-love/wallpaper/theme'
import {createMonitorWallpaper} from '@winter-love/wallpaper/settings/model'
import {applyTheme} from '../apply-theme'

const repositories = vi.hoisted(() => ({
  library: {read: vi.fn(), replaceWidgets: vi.fn()},
  settings: {read: vi.fn(), save: vi.fn()},
}))

vi.mock('../repositories', () => ({
  withThemeRepositories: (operation: (value: typeof repositories) => Promise<unknown>) =>
    operation(repositories),
}))
vi.mock('../../connection-profiles/builtin-profile', () => ({
  builtinConnectionProfile: () => undefined,
}))
vi.mock('../../settings/read-puppet-file', () => ({readPuppetFile: vi.fn()}))

const monitor = {height: 1080, id: 'primary', name: 'Primary', width: 1920, x: 0, y: 0}
const otherMonitor = {...monitor, id: 'secondary', name: 'Secondary', x: 1920}
const other = {assetId: 'builtin:ash', id: 'other', x: 2000, y: 100}
const previous = {assetId: 'builtin:ash', id: 'previous', x: 100, y: 100}
const wallpaper = createMonitorWallpaper(monitor.id)
const manifest: ThemeArchive['manifest'] = {
  assets: [],
  format: 'poffo-theme',
  name: 'Test Theme',
  version: 1,
}

const apply = (input: ThemeArchive['manifest']) =>
  applyTheme({archive: {assets: {}, manifest: input}, monitor, monitors: [monitor, otherMonitor]})

beforeEach(() => {
  vi.clearAllMocks()
  repositories.settings.read.mockResolvedValue([wallpaper])
  repositories.library.read.mockResolvedValue({widgets: [previous, other]})
})

describe('applyTheme', () => {
  it('should apply and restore a background without replacing any widgets', async () => {
    const background = {mode: 'website', url: 'https://example.com/'} as const
    const undo = await apply({...manifest, background})
    expect(repositories.settings.save).toHaveBeenCalledWith({...wallpaper, content: background})

    await undo()
    expect(repositories.settings.save).toHaveBeenLastCalledWith(wallpaper)
    expect(repositories.library.read).not.toHaveBeenCalled()
    expect(repositories.library.replaceWidgets).not.toHaveBeenCalled()
  })

  it('should apply and restore selected-screen widgets without writing any background', async () => {
    const undo = await apply({
      ...manifest,
      assets: [
        {builtinId: 'builtin:ash', id: 'ash', kind: 'puppet', name: 'Ash', source: 'builtin'},
      ],
      widgets: [{assetId: 'ash', x: 0.5, y: 0.5}],
    })
    expect(repositories.library.replaceWidgets).toHaveBeenCalledWith(
      [previous.id],
      [expect.objectContaining({assetId: 'builtin:ash'})],
    )
    const installed = repositories.library.replaceWidgets.mock.calls[0]![1][0]

    await undo()
    expect(repositories.library.replaceWidgets).toHaveBeenLastCalledWith([installed.id], [previous])
    expect(repositories.settings.read).not.toHaveBeenCalled()
    expect(repositories.settings.save).not.toHaveBeenCalled()
  })
})
