import {expect, it, vi} from 'vitest'
import {readThemeArchive} from '@winter-love/wallpaper/theme-archive'
import {exportTheme} from '../export-theme'

const repositories = vi.hoisted(() => ({
  library: {
    read: vi.fn(async () => ({
      widgets: [
        {assetId: 'builtin:ash', id: 'first', x: 0, y: 0},
        {assetId: 'builtin:ash', id: 'second', motionId: 'picked-motion', x: 500, y: 100},
        {assetId: 'builtin:ash', id: 'third', x: 1500, y: 100},
      ],
    })),
  },
  media: {read: vi.fn(async () => ({items: []}))},
  settings: {listPuppets: vi.fn(async () => [{id: 'builtin:ash', name: 'Ash'}])},
}))

vi.mock('../repositories', () => ({
  withThemeRepositories: (operation: (value: typeof repositories) => Promise<unknown>) =>
    operation(repositories),
}))

const monitor = {height: 800, id: 'first', name: 'First', width: 1200, x: 0, y: 0}
const other = {...monitor, id: 'second', name: 'Second', x: 1200}
const screen = {monitor, monitors: [monitor, other], name: 'Widgets'}

it('should include only the chosen widget when two widgets use the same model', async () => {
  const bytes = await exportTheme({...screen, widgetIds: ['second']})
  const {manifest} = readThemeArchive(bytes)
  expect(manifest.background).toBeUndefined()
  expect(manifest.widgets).toEqual([
    expect.objectContaining({assetId: 'asset-1', motionId: 'picked-motion'}),
  ])
  expect(manifest.assets).toEqual([
    {builtinId: 'builtin:ash', id: 'asset-1', kind: 'puppet', name: 'Ash', source: 'builtin'},
  ])
})

it('should reject a selected widget that moved to another screen', async () => {
  await expect(exportTheme({...screen, widgetIds: ['third']})).rejects.toThrow(
    'A selected widget is no longer on this screen.',
  )
})
