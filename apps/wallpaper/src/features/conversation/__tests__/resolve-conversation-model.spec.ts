import {expect, it} from 'vitest'
import type {PoffoConversation} from '@winter-love/wallpaper/settings/conversation'
import {resolveConversationModel} from '../resolve-conversation-model'

const MODELS = [
  {default: false, id: 'other', name: 'Other'},
  {default: true, id: 'recommended', name: 'Recommended'},
]

it('should retain a supported explicit model and a local selection', () => {
  const codex: PoffoConversation = {codexModel: 'other', provider: 'codex'}
  const local: PoffoConversation = {provider: 'local'}
  expect(resolveConversationModel(codex, MODELS)).toBe(codex)
  expect(resolveConversationModel(local, MODELS)).toBe(local)
})

it('should resolve a legacy default option to the concrete recommended model', () => {
  expect(resolveConversationModel({provider: 'codex'}, MODELS)).toEqual({
    codexModel: 'recommended',
    provider: 'codex',
  })
})

it('should switch a retired model to local even when a different model is recommended', () => {
  expect(resolveConversationModel({codexModel: 'retired', provider: 'codex'}, MODELS)).toEqual({
    provider: 'local',
  })
})

it('should switch to local when Codex returns no available models', () => {
  expect(resolveConversationModel({provider: 'codex'}, [])).toEqual({provider: 'local'})
  expect(resolveConversationModel({codexModel: 'retired', provider: 'codex'}, [])).toEqual({
    provider: 'local',
  })
})
