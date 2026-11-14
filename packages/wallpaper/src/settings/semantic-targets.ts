import type {SemanticAction, SemanticBinding} from './semantics'

/** Reads a bundle or its legacy single target; an explicitly empty bundle stays empty. */
export const semanticTargets = (binding: SemanticBinding): readonly SemanticAction[] =>
  binding.actions ?? (binding.action === undefined ? [] : [binding.action])
