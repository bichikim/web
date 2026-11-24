/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {MAX_CONNECTION_BYTES} from '@winter-love/wallpaper/settings/connections'
import {DEFAULT_POFFO_SPEECH, type PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
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

it('should round-trip every input profile while preserving legacy defaults for untouched inputs', async () => {
  let downloaded: Blob | null = null
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL(blob: Blob) {
        downloaded = blob
        return 'blob:gaze-test'
      }
      static revokeObjectURL() {}
    },
  )
  try {
    const widget = await repository.addWidget('character')
    const {profiles} = mount({
      ...widget,
      tracking: 'cursor',
      trackingBindingsVersion: 1,
      trackingOptions: {headFollowSpeed: 0.8},
      trackingProfiles: {
        camera: {bindings: {headX: {parameterId: 'Param71'}}, options: {headFollowSpeed: 2}},
        cursor: {options: {headFollowSpeed: 1}},
      },
    })
    profiles.exportFile()
    expect(downloaded).not.toBeNull()
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Expected text'))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(downloaded!)
    })
    const exported = JSON.parse(raw)
    expect(exported.connections.trackingBindingsVersion).toBe(1)
    expect(exported.connections.trackingOptions).toEqual({headFollowSpeed: 1})
    expect(exported.connections.trackingProfiles).toEqual({
      camera: {bindings: {headX: {parameterId: 'Param71'}}, options: {headFollowSpeed: 2}},
      'camera-pose': {bindings: {}, options: {headFollowSpeed: 0.8}},
      cursor: {bindings: {}, options: {headFollowSpeed: 1}},
      off: {bindings: {}, options: {headFollowSpeed: 0.8}},
    })
    const file = new File([raw], 'gaze-settings.json')
    Object.defineProperty(file, 'text', {value: async () => raw})
    await profiles.importFile([file])
    expect(profiles.error()).toBeNull()
    expect((await repository.read()).widgets[0].trackingBindingsVersion).toBe(1)
    expect((await repository.read()).widgets[0].trackingProfiles).toEqual(
      exported.connections.trackingProfiles,
    )
  } finally {
    dispose?.()
    dispose = undefined
    click.mockRestore()
    vi.unstubAllGlobals()
  }
})

it('should import tracking and connections and restore Ash lip sync to threefold gain', async () => {
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
  await profiles.restore()
  expect((await repository.read()).widgets[0].speech?.lipsync).toEqual({gain: 3, source: 'voice'})
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
  expect((await repository.read()).widgets[0]?.speech).toEqual(DEFAULT_POFFO_SPEECH)
})
it('should reject oversized files before reading or applying their contents', async () => {
  const {profiles} = mount(await repository.addWidget('builtin:ash'))
  const file = new File([new Uint8Array(MAX_CONNECTION_BYTES + 1)], 'large.json')
  const text = vi.fn().mockResolvedValue(profile)
  Object.defineProperty(file, 'text', {value: text})
  await profiles.importFile([file])
  expect(text).not.toHaveBeenCalled()
  expect(profiles.error()).toContain('256 KB')
  expect((await repository.read()).widgets[0]?.speech).toEqual(DEFAULT_POFFO_SPEECH)
})
