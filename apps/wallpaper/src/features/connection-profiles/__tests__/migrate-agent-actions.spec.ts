import {expect, it} from 'vitest'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import {migrateAgentActions} from '../migrate-agent-actions'

it('should remove only the previous default tool action and retain other state connections', () => {
  const bindings: AgentStateBindings = {
    tool: {actions: [{id: '안경', kind: 'expression'}], parameterId: null},
    working: {on: 0.6, parameterId: 'custom'},
  }
  const migrated = migrateAgentActions(bindings)!
  expect(migrated.tool).toEqual({actions: [], parameterId: null})
  expect(migrated.working).toBe(bindings.working)
  expect(bindings.tool?.actions).toHaveLength(1)
  expect(migrateAgentActions(migrated)).toBe(migrated)
})

it('should retain missing, empty and custom tool connections', () => {
  expect(migrateAgentActions(undefined)).toBeUndefined()
  const empty: AgentStateBindings = {}
  const custom: AgentStateBindings = {
    tool: {actions: [{id: '노트 들기', kind: 'expression'}], parameterId: null},
  }
  const bundle: AgentStateBindings = {
    tool: {
      actions: [
        {id: '안경', kind: 'expression'},
        {id: '노트 들기', kind: 'expression'},
      ],
      parameterId: null,
    },
  }
  expect(migrateAgentActions(empty)).toBe(empty)
  expect(migrateAgentActions(custom)).toBe(custom)
  expect(migrateAgentActions(bundle)).toBe(bundle)
})

it('should retain customized parameter controls even when they include glasses', () => {
  const bindings: AgentStateBindings = {
    tool: {actions: [{id: '안경', kind: 'expression'}], on: 0.5, parameterId: 'custom'},
  }
  expect(migrateAgentActions(bindings)).toBe(bindings)
})
