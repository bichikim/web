/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {MAX_CONNECTION_BYTES} from '@winter-love/wallpaper/settings/connections'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {useConnectionProfiles} from '../use-connection-profiles'

let repository: ReturnType<typeof createLibraryRepository>
beforeEach(() => {
  repository = createLibraryRepository('wallpaper-library')
})
let dispose: (() => void) | undefined
afterEach(async () => {
  dispose?.()
  dispose = undefined
  repository.close()
  await Dexie.delete('wallpaper-library')
})
const mount = (widget: PoffoWidget) =>
  createRoot((cleanup) => {
    dispose = cleanup
    const [current, setCurrent] = createSignal<PoffoWidget | undefined>(widget)
    return {
      profiles: useConnectionProfiles({
        parameters: () => [{defaultValue: 0, id: 'Param71', maximum: 1, minimum: 0}],
        widget: current,
      }),
      setCurrent,
    }
  })
const profile = JSON.stringify({
  assetId: 'builtin:ash',
  connections: {semanticBindings: []},
  format: 'poffo-connections',
  version: 1,
})

it('should restore face, eye and connection settings together with the tracking input mode', async () => {
  const widget = await repository.addWidget('builtin:ash')
  await repository.trackWidget(widget.id, 'camera')
  const {profiles} = mount(widget)
  const connections = {
    agentBindings: {working: {off: 0, on: 1, parameterId: 'Param71'}},
    lipsync: {source: 'voice'},
    randomActions: {enabled: true, probability: 0.4},
    semanticBindings: [],
    tracking: 'cursor',
    trackingBindings: {headX: {blend: 'add', inverted: true, parameterId: 'Param71'}},
    trackingOptions: {
      cursorReach: 0.5,
      eyeCenterY: 0.2,
      eyeMaximumY: 0.7,
      eyeMinimumY: -0.4,
      eyeResponseY: 1.5,
      headCenterX: 4,
      headMaximumX: 20,
      headMinimumX: -10,
      headResponseX: 0.5,
    },
  }
  const text = JSON.stringify({
    assetId: widget.assetId,
    connections,
    format: 'poffo-connections',
    version: 1,
  })
  const file = new File([text], 'poffo-settings.json')
  Object.defineProperty(file, 'text', {value: async () => text})
  await profiles.importFile([file])
  expect(profiles.error()).toBeNull()
  expect((await repository.read()).widgets[0]).toMatchObject({
    speech: {
      agentBindings: connections.agentBindings,
      lipsync: connections.lipsync,
      randomActions: connections.randomActions,
      semanticBindings: [],
    },
    tracking: 'cursor',
    trackingBindings: connections.trackingBindings,
    trackingOptions: connections.trackingOptions,
  })
})

it('should keep file reads busy and skip overlapping restore requests', async () => {
  const widget = await repository.addWidget('builtin:ash')
  await repository.trackWidget(widget.id, 'camera')
  const {profiles} = mount(widget)
  const text = Promise.withResolvers<string>()
  const file = new File(['{}'], 'profile.json')
  Object.defineProperty(file, 'text', {value: () => text.promise})
  const importing = profiles.importFile([file])
  expect(profiles.busy()).toBe(true)
  expect(profiles.restore()).toBe(importing)
  text.resolve(profile)
  await importing
  expect(profiles.busy()).toBe(false)
  expect((await repository.read()).widgets[0]?.speech?.semanticBindings).toEqual([])
  expect((await repository.read()).widgets[0]?.tracking).toBe('camera')
})
it('should discard a delayed import after selecting a different widget', async () => {
  const widget = await repository.addWidget('builtin:ash')
  const {profiles, setCurrent} = mount(widget)
  const text = Promise.withResolvers<string>()
  const file = new File(['{}'], 'profile.json')
  Object.defineProperty(file, 'text', {value: () => text.promise})
  const importing = profiles.importFile([file])
  setCurrent({...widget, id: 'different'})
  text.resolve(profile)
  await importing
  expect((await repository.read()).widgets[0]?.speech).toBeUndefined()
})
it('should reject oversized files before reading or applying their contents', async () => {
  const {profiles} = mount(await repository.addWidget('builtin:ash'))
  const file = new File([new Uint8Array(MAX_CONNECTION_BYTES + 1)], 'large.json')
  const text = vi.fn().mockResolvedValue(profile)
  Object.defineProperty(file, 'text', {value: text})
  await profiles.importFile([file])
  expect(text).not.toHaveBeenCalled()
  expect(profiles.error()).toContain('256 KB')
  expect((await repository.read()).widgets[0]?.speech).toBeUndefined()
})
