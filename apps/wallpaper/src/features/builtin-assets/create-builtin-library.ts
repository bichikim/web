import {
  createLibraryRepository,
  type LibraryRepository,
} from '@winter-love/wallpaper/settings/library-repository'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {builtinConnectionProfile} from '../connection-profiles/builtin-profile'
import {migrateSemanticActions} from '../connection-profiles/migrate-semantic-actions'

export const createBuiltinLibrary = (name: string): LibraryRepository => {
  const repository = createLibraryRepository(name)
  const initialize = async (widget: PoffoWidget) => {
    const profile = builtinConnectionProfile(widget.assetId)
    if (profile !== undefined && widget.speech?.semanticBindings === undefined) {
      await repository.configureConnections(widget.id, profile.connections, 'missing')
    } else if (widget.assetId === 'builtin:ash' && widget.speech?.semanticBindings !== undefined) {
      const semanticBindings = migrateSemanticActions(widget.speech.semanticBindings)
      if (semanticBindings !== widget.speech.semanticBindings) {
        await repository.configureConnections(widget.id, {semanticBindings})
      }
    }
  }
  return {
    ...repository,
    async addWidget(assetId) {
      const widget = await repository.addWidget(assetId)
      await initialize(widget)
      return (await repository.read()).widgets.find((item) => item.id === widget.id)!
    },
    async read() {
      const snapshot = await repository.read()
      const pending = snapshot.widgets.filter(
        (widget) =>
          widget.assetId === 'builtin:ash' &&
          (widget.speech?.semanticBindings === undefined ||
            migrateSemanticActions(widget.speech.semanticBindings) !==
              widget.speech.semanticBindings),
      )
      if (pending.length === 0) {
        return snapshot
      }
      await Promise.all(pending.map(initialize))
      return repository.read()
    },
  }
}
