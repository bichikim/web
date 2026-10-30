/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {createStore} from 'solid-js/store'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {useRuntimeControls} from '../../use-runtime-controls'
import {useWorkspaceLayout} from '../use-workspace-layout'
import type {Node} from '@dschz/solid-flow'
afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
const document = createDemoDocument()
const mount = () =>
  renderHook(() => {
    const controls = useRuntimeControls({document: () => document, onMotion: () => undefined})
    const [nodes, setNodes] = createStore<Node[]>([
      {data: {}, id: 'manual', position: {x: 0, y: 0}},
    ])
    const [extraPorts, setExtraPorts] = createSignal<string[]>([])
    const [hiddenIds, restoreHiddenIds] = createSignal<readonly string[]>([])
    useWorkspaceLayout({
      controls,
      extraPorts,
      hiddenIds,
      nodes: () => nodes,
      restoreHiddenIds,
      setExtraPorts,
      setNodes,
    })
    return {controls, nodes, setNodes}
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
