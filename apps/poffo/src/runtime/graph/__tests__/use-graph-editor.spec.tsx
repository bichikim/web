/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../../../tracking/create-runtime-profile'
import {getRuntimeParameters} from '../../../tracking/parameter-groups'
import {useRuntimeControls} from '../../use-runtime-controls'
import {useGraphEditor} from '../use-graph-editor'

const first = createDemoDocument()
const second = {
  ...first,
  parameters: [
    ...(first.parameters ?? []),
    {defaultValue: 0, id: 'signature-probe', maximum: 1, minimum: 0, name: 'Probe'},
  ],
}
const layoutKey = (document = first) =>
  `puppet:studio-layout:v1:${createRuntimeProfile(document).signature}`
const mount = () => {
  const [document, setDocument] = createSignal(first)
  return renderHook(() => {
    const controls = useRuntimeControls({document, onMotion: () => undefined})
    const workspace = useGraphEditor({
      controls,
      get parameters() {
        const profile = controls.profile()
        return getRuntimeParameters(
          document().parameters ?? [],
          profile?.groups ?? [],
          profile?.drafts ?? [],
        )
      },
    })
    return {controls, setDocument, workspace}
  })
}
const nodeIds = (workspace: ReturnType<typeof useGraphEditor>) =>
  workspace.nodes.map((node) => node.id)

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

test.each(['missing', 'invalid-json', 'invalid-layout', 'read-failure'] as const)(
  'should clear previous model hidden cards when the next layout is %s',
  async (stored) => {
    const {result} = mount()
    result.workspace.addPort('angle-x')
    result.workspace.removeCard('parameter:angle-x')
    result.workspace.removeCard('manual')
    expect(nodeIds(result.workspace)).not.toContain('parameter:angle-x')
    expect(nodeIds(result.workspace)).not.toContain('manual')
    if (stored === 'invalid-json') {
      sessionStorage.setItem(layoutKey(second), '{')
    } else if (stored === 'invalid-layout') {
      sessionStorage.setItem(layoutKey(second), JSON.stringify({version: 1}))
    } else if (stored === 'read-failure') {
      const getItem = Storage.prototype.getItem
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        function readStorage(this: Storage, key) {
          if (key === layoutKey(second)) {
            throw new DOMException('Storage access denied', 'SecurityError')
          }
          return getItem.call(this, key)
        },
      )
    }
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    result.setDocument(second)
    await Promise.resolve()
    expect(nodeIds(result.workspace)).toContain('parameter:angle-x')
    expect(nodeIds(result.workspace)).toContain('manual')
    const layouts = writes.mock.calls
      .filter(([key]) => key === layoutKey(second))
      .map(([, value]) => JSON.parse(value))
    expect(layouts.length).toBeGreaterThan(0)
    expect(layouts.every((layout) => layout.hiddenIds.length === 0)).toBe(true)
    expect(result.workspace.error()).toBe(
      stored === 'read-failure' || stored === 'invalid-json'
        ? '스튜디오 배치를 복원하지 못했습니다.'
        : null,
    )
    result.setDocument(first)
    await Promise.resolve()
    expect(nodeIds(result.workspace)).not.toContain('parameter:angle-x')
    expect(nodeIds(result.workspace)).not.toContain('manual')
  },
)

test('should restore each model hidden cards and positions before saving during A to B to A', async () => {
  const {result} = mount()
  result.workspace.addPort('angle-x')
  result.workspace.removeCard('parameter:angle-x')
  const firstLayout = JSON.parse(sessionStorage.getItem(layoutKey())!)
  const nextLayout = {
    ...firstLayout,
    extraPorts: ['angle-x'],
    hiddenIds: ['manual'],
    positions: [{id: 'parameter:angle-x', x: 321, y: 456}],
    signature: createRuntimeProfile(second).signature,
  }
  sessionStorage.setItem(layoutKey(second), JSON.stringify(nextLayout))
  const writes = vi.spyOn(Storage.prototype, 'setItem')
  result.setDocument(second)
  await Promise.resolve()
  expect(nodeIds(result.workspace)).toContain('parameter:angle-x')
  expect(nodeIds(result.workspace)).not.toContain('manual')
  expect(result.workspace.nodes.find((node) => node.id === 'parameter:angle-x')?.position).toEqual({
    x: 321,
    y: 456,
  })
  const saved = writes.mock.calls
    .filter(([key]) => key === layoutKey(second))
    .map(([, value]) => JSON.parse(value))
  expect(saved.length).toBeGreaterThan(0)
  for (const layout of saved) {
    expect(layout.hiddenIds).toEqual(['manual'])
    expect(layout.positions).toContainEqual({id: 'parameter:angle-x', x: 321, y: 456})
  }
  result.setDocument(first)
  await Promise.resolve()
  expect(nodeIds(result.workspace)).not.toContain('parameter:angle-x')
  expect(nodeIds(result.workspace)).toContain('manual')
  expect(JSON.parse(sessionStorage.getItem(layoutKey())!).hiddenIds).toEqual(firstLayout.hiddenIds)
})

test('should retain hidden cards during edits to the same model profile', () => {
  const {result} = mount()
  result.workspace.removeCard('manual')
  result.controls.setInputValue('buttonValue', 1)
  expect(nodeIds(result.workspace)).not.toContain('manual')
  expect(JSON.parse(sessionStorage.getItem(layoutKey())!).hiddenIds).toEqual(['manual'])
})

test('should retain the latest model layout when models switch before queued positions restore', async () => {
  const {result} = mount()
  result.workspace.removeCard('manual')
  result.setDocument(second)
  result.workspace.removeCard('button')
  result.setDocument(first)
  result.setDocument(second)
  await Promise.resolve()
  expect(nodeIds(result.workspace)).toContain('manual')
  expect(nodeIds(result.workspace)).not.toContain('button')
  expect(JSON.parse(sessionStorage.getItem(layoutKey(second))!).hiddenIds).toEqual(['button'])
  expect(JSON.parse(sessionStorage.getItem(layoutKey())!).hiddenIds).toEqual(['manual'])
})
