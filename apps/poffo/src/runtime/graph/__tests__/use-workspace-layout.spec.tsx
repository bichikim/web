/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {createStore} from 'solid-js/store'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument, createEmptyDocument} from '@winter-love/puppet/player'
import {useRuntimeControls} from '../../use-runtime-controls'
import {useWorkspaceLayout} from '../use-workspace-layout'
import type {Node} from '@dschz/solid-flow'
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
const document = createDemoDocument()
const mount = (source = () => document, layoutStorage?: Pick<Storage, 'getItem' | 'setItem'>) =>
  renderHook(() => {
    const controls = useRuntimeControls({document: source, onMotion: () => undefined})
    const [nodes, setNodes] = createStore<Node[]>([
      {data: {}, id: 'manual', position: {x: 0, y: 0}},
    ])
    const [extraPorts, setExtraPorts] = createSignal<string[]>([])
    const [hiddenIds, restoreHiddenIds] = createSignal<readonly string[]>([])
    const workspace = useWorkspaceLayout({
      controls,
      extraPorts,
      hiddenIds,
      nodes: () => nodes,
      restoreHiddenIds,
      sessionStorage: layoutStorage,
      setExtraPorts,
      setNodes,
    })
    return {controls, nodes, setNodes, workspace}
  })
test('should save moved positions and restore once without resetting subsequent profile edits', async () => {
  const first = mount()
  first.result.setNodes(0, 'position', {x: 123, y: -45})
  first.result.controls.setInputValue('manualValue', 0.7)
  expect(first.result.controls.inputValues().manualValue).toBe(0.7)
  first.cleanup()
  const second = mount()
  await Promise.resolve()
  expect(second.result.nodes[0]?.position).toEqual({x: 123, y: -45})
  second.result.controls.setInputValue('manualValue', 0.9)
  expect(second.result.controls.inputValues().manualValue).toBe(0.9)
  expect(second.result.nodes[0]?.position).toEqual({x: 123, y: -45})
})

const studioFile = (text: Promise<string>) =>
  Object.assign(new File([], 'studio.json'), {text: () => text})

test.each(['profile', 'layout'] as const)(
  'should retain the latest imported %s when an earlier read finishes last',
  async (kind) => {
    const {result} = mount()
    const earlier = Promise.withResolvers<string>()
    const profile = result.controls.profile()!
    const content = (value: number) =>
      JSON.stringify(
        kind === 'profile'
          ? {...profile, inputs: {buttonValue: 0, manualValue: value}}
          : {
              collapsedCorrections: [],
              collapsedGroups: [],
              collapsedInputs: [],
              extraPorts: [],
              hiddenIds: [],
              positions: [{id: 'manual', x: value, y: 0}],
              signature: profile.signature,
              version: 1,
            },
      )
    const pending = result.workspace.importStudio(studioFile(earlier.promise))
    await result.workspace.importStudio(studioFile(Promise.resolve(content(0.8))))
    earlier.resolve(content(0.2))
    await pending
    expect(
      kind === 'profile' ? result.controls.inputValues().manualValue : result.nodes[0]?.position.x,
    ).toBe(0.8)
    expect(result.workspace.error()).toBeNull()
  },
)

test('should ignore an earlier read failure after a newer import succeeds', async () => {
  const {result} = mount()
  const earlier = Promise.withResolvers<string>()
  const pending = result.workspace.importStudio(studioFile(earlier.promise))
  await result.workspace.importStudio(
    studioFile(Promise.resolve(JSON.stringify(result.controls.profile()))),
  )
  earlier.reject(new Error('obsolete read failed'))
  await pending
  expect(result.workspace.error()).toBeNull()
})

const createStorage = () => {
  const entries = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value)
    }),
  }
}

test('should save and restore graph positions through the provided session storage', async () => {
  const storage = createStorage()
  const first = mount(undefined, storage)
  const key = `puppet:studio-layout:v1:${first.result.controls.profile()!.signature}`
  first.result.setNodes(0, 'position', {x: 123, y: -45})
  expect(JSON.parse(storage.getItem(key) ?? 'null')).toMatchObject({
    positions: [{id: 'manual', x: 123, y: -45}],
  })
  first.cleanup()
  const second = mount(undefined, storage)
  await Promise.resolve()
  expect(second.result.nodes[0]?.position).toEqual({x: 123, y: -45})
  expect(second.result.workspace.error()).toBeNull()
})

test.each(['read-failure', 'invalid-json'] as const)(
  'should report a session storage %s and keep the graph editable',
  (failure) => {
    const storage = createStorage()
    if (failure === 'read-failure') {
      storage.getItem.mockImplementationOnce(() => {
        throw new DOMException('Storage access denied', 'SecurityError')
      })
    } else {
      storage.getItem.mockReturnValueOnce('{')
    }
    const {result} = mount(undefined, storage)
    expect(result.workspace.error()).toBe('스튜디오 배치를 복원하지 못했습니다.')
    expect(result.nodes[0]?.position).toEqual({x: 0, y: 0})
    result.workspace.dismissError()
    result.setNodes(0, 'position', {x: 42, y: -3})
    const key = `puppet:studio-layout:v1:${result.controls.profile()!.signature}`
    expect(JSON.parse(storage.getItem(key) ?? 'null')).toMatchObject({
      positions: [{id: 'manual', x: 42, y: -3}],
    })
    expect(result.workspace.error()).toBeNull()
  },
)

test('should retain graph edits after a write failure and persist later changes', () => {
  const storage = createStorage()
  storage.setItem.mockImplementationOnce(() => {
    throw new DOMException('Storage full', 'QuotaExceededError')
  })
  const {result} = mount(undefined, storage)
  expect(result.workspace.error()).toBe('스튜디오 배치를 보관하지 못했습니다.')
  result.workspace.dismissError()
  result.setNodes(0, 'position', {x: 15, y: 24})
  expect(result.nodes[0]?.position).toEqual({x: 15, y: 24})
  const key = `puppet:studio-layout:v1:${result.controls.profile()!.signature}`
  expect(JSON.parse(storage.getItem(key) ?? 'null')).toMatchObject({
    positions: [{id: 'manual', x: 15, y: 24}],
  })
  expect(result.workspace.error()).toBeNull()
})

test.each(['success', 'failure'] as const)(
  'should ignore a pending import %s after workspace disposal',
  async (outcome) => {
    const mounted = mount()
    const {controls, workspace} = mounted.result
    const reading = Promise.withResolvers<string>()
    const profile = controls.profile()
    const pending = workspace.importStudio(studioFile(reading.promise))
    mounted.cleanup()
    if (outcome === 'success') {
      reading.resolve(JSON.stringify({...profile, inputs: {buttonValue: 0, manualValue: 0.8}}))
    } else {
      reading.reject(new Error('late read failure'))
    }
    await pending
    expect(controls.profile()).toBe(profile)
    expect(workspace.error()).toBeNull()
  },
)

test('should clear a previous import failure when a new file is accepted', async () => {
  const {result} = mount()
  await result.workspace.importStudio(studioFile(Promise.resolve('{}')))
  expect(result.workspace.error()).not.toBeNull()
  await result.workspace.importStudio(
    studioFile(Promise.resolve(JSON.stringify(result.controls.profile()))),
  )
  expect(result.workspace.error()).toBeNull()
})

test.each(['disposal', 'model-change'] as const)(
  'should not apply queued stored positions after %s',
  async (transition) => {
    const profile = mount().result.controls.profile()!
    sessionStorage.setItem(
      `puppet:studio-layout:v1:${profile.signature}`,
      JSON.stringify({
        collapsedCorrections: [],
        collapsedGroups: [],
        collapsedInputs: [],
        extraPorts: [],
        hiddenIds: [],
        positions: [{id: 'manual', x: 42, y: 0}],
        signature: profile.signature,
        version: 1,
      }),
    )
    const [source, setSource] = createSignal(document)
    const mounted = mount(source)
    if (transition === 'disposal') {
      mounted.cleanup()
    } else {
      setSource(createEmptyDocument())
    }
    await Promise.resolve()
    expect(mounted.result.nodes[0]?.position).toEqual({x: 0, y: 0})
  },
)

test('should ignore a pending import failure after changing the model', async () => {
  const [source, setSource] = createSignal(document)
  const {result} = mount(source)
  const reading = Promise.withResolvers<string>()
  const pending = result.workspace.importStudio(studioFile(reading.promise))
  setSource(createEmptyDocument())
  reading.reject(new Error('previous model read failed'))
  await pending
  expect(result.workspace.error()).toBeNull()
})

test.each([false, true])(
  'should reconcile the selected expression after importing a profile (retain ID: %s)',
  async (retainId) => {
    const {result} = mount()
    const {controls, workspace} = result
    const parameter = document.parameters![0]!
    controls.setManual(parameter.id, parameter.maximum)
    controls.addExpression('Pose')
    const id = controls.activeExpression()
    expect(id).not.toBeNull()
    controls.setManual(parameter.id, parameter.minimum)
    const profile = controls.profile()!
    await workspace.importStudio(
      studioFile(
        Promise.resolve(
          JSON.stringify({
            ...profile,
            expressions: retainId ? profile.expressions : [],
          }),
        ),
      ),
    )
    expect(workspace.error()).toBeNull()
    expect(controls.profile()!.expressions).toHaveLength(retainId ? 1 : 0)
    expect(controls.activeExpression()).toBe(retainId ? id : null)
    expect(controls.manual()).toEqual({[parameter.id]: parameter.minimum})
    expect(controls.values()[parameter.id]).toBe(parameter.minimum)
    controls.clearManual()
    expect(controls.values()[parameter.id]).toBe(retainId ? parameter.maximum : undefined)
  },
)
