import type {PoffoConversation} from '@winter-love/wallpaper/settings/conversation'
import type {CodexModel} from './codex'

/** Resolves legacy defaults and returns local when a selected model leaves the live catalog. */
export const resolveConversationModel = (
  value: PoffoConversation,
  models: readonly CodexModel[],
): PoffoConversation => {
  if (value.provider === 'local') {
    return value
  }
  if (value.codexModel === undefined) {
    const recommended = models.find((model) => model.default) ?? models[0]
    return recommended === undefined
      ? {provider: 'local'}
      : {codexModel: recommended.id, provider: 'codex'}
  }
  return models.some((model) => model.id === value.codexModel) ? value : {provider: 'local'}
}
