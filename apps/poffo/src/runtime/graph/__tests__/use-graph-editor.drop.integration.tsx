/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createDemoDocument} from '@winter-love/puppet/player'
import {afterEach, expect, it} from 'vitest'
import {useRuntimeControls} from '../../use-runtime-controls'
import {useGraphEditor} from '../use-graph-editor'

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

it('should accept generated broadcast header bounds and retain the drop across remount', () => {
  const document = createDemoDocument()
  const mount = () =>
    renderHook(() => {
      const controls = useRuntimeControls({document: () => document, onMotion: () => undefined})
      const workspace = useGraphEditor({controls, parameters: document.parameters ?? []})
      return {controls, workspace}
    })
  const first = mount()
  const {controls, workspace} = first.result
  const profile = controls.profile()!
  controls.updateProfile({
    ...profile,
    groups: [{id: 'broadcast', mode: 'broadcast', name: 'Broadcast', parameterIds: []}],
  })
  workspace.addPort('angle-x')
  const container = workspace.nodes.find((node) => node.id === 'parameter:group:broadcast')!
  const parameter = workspace.nodes.find((node) => node.id === 'parameter:angle-x')!
  expect(container.measured).toBeUndefined()
  expect(container.style).toEqual({'--group-height': '64px'})

  workspace.handleDragStop({
    targetNode: {
      ...parameter,
      position: {x: container.position.x + 30, y: container.position.y + 30},
    },
  })

  expect(controls.profile()?.groups?.[0].parameterIds).toEqual(['angle-x'])
  expect(workspace.nodes.find((node) => node.id === parameter.id)).toMatchObject({
    parentId: container.id,
    position: {x: 0, y: 64},
  })
  const stored = JSON.parse(
    sessionStorage.getItem(`puppet:runtime-session:v1:${profile.signature}`)!,
  )
  expect(stored.groups[0].parameterIds).toEqual(['angle-x'])
  first.cleanup()

  const restored = mount().result
  expect(restored.controls.profile()?.groups?.[0].parameterIds).toEqual(['angle-x'])
  expect(restored.workspace.nodes.find((node) => node.id === parameter.id)).toMatchObject({
    parentId: container.id,
    position: {x: 0, y: 64},
  })
})
