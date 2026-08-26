import {beforeEach, describe, expect, it, vi} from 'vitest'

import {clientOnly} from '@solidjs/start'
import {lazy} from 'solid-js'

vi.mock('@solidjs/start', () => ({clientOnly: vi.fn()}))
vi.mock('solid-js', () => ({lazy: vi.fn()}))
vi.mock('../album-library/Content', () => ({default: vi.fn()}))
vi.mock('../character-studio/Canvas', () => ({default: vi.fn()}))
vi.mock('../dialogue-settings/Content', () => ({default: vi.fn()}))
vi.mock('../dialogue-page/Editor', () => ({default: vi.fn()}))
vi.mock('../feed-settings/Content', () => ({default: vi.fn()}))
vi.mock('../layer-review/Canvas', () => ({default: vi.fn()}))
vi.mock('../music-player/Content', () => ({default: vi.fn()}))
vi.mock('../p-studio/SceneCanvas', () => ({default: vi.fn()}))
vi.mock('../PSettings', () => ({default: vi.fn()}))
vi.mock('src/components/ChatRoom', () => ({default: vi.fn()}))
vi.mock('src/components/DialogueWriter', () => ({default: vi.fn()}))
vi.mock('src/components/SpeechToTextLab', () => ({default: vi.fn()}))
vi.mock('src/components/TextMoodLab', () => ({default: vi.fn()}))

const wrapperCases = [
  ['character viewport', () => import('../character-studio/ViewportCanvas')],
  ['chat workspace', () => import('../dev/chat/Workspace')],
  ['dialogue editor', () => import('../dialogue-page/EditorContent')],
  ['dialogue settings', () => import('../dialogue-settings/Panel')],
  ['dialogue workspace', () => import('../dev/dialogue/Workspace')],
  ['feed settings', () => import('../feed-settings/Panel')],
  ['layer review', () => import('../layer-review/Viewport')],
  ['music player', () => import('../music-player/Panel')],
  ['studio scene', () => import('../p-studio/Scene')],
  ['studio settings', () => import('../p-studio/SettingsPanel')],
  ['speech workspace', () => import('../dev/speech-to-text/Workspace')],
  ['text mood workspace', () => import('../dev/text-mood/Workspace')],
] as const

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.mocked(clientOnly).mockReturnValue(vi.fn() as unknown as ReturnType<typeof clientOnly>)
  vi.mocked(lazy).mockReturnValue(vi.fn() as unknown as ReturnType<typeof lazy>)
})

it('should register and load the album library lazily', async () => {
  await import('../album-library/Panel')

  expect(lazy).toHaveBeenCalledWith(expect.any(Function))
  const loader = vi.mocked(lazy).mock.calls[0]?.[0]
  const loadedModule = await loader?.()
  expect(loadedModule?.default).toEqual(expect.any(Function))
})

describe.each(wrapperCases)('%s client-only wrapper', (_name, loadWrapper) => {
  it('should register and load the client component lazily', async () => {
    await loadWrapper()

    expect(clientOnly).toHaveBeenCalledWith(expect.any(Function), {lazy: true})
    const loader = vi.mocked(clientOnly).mock.calls.at(-1)?.[0]
    const loadedModule = await loader?.()
    expect(loadedModule?.default).toEqual(expect.any(Function))
  })
})
