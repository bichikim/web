import type {SemanticBinding} from './semantics'

export const semanticGroup = (binding: SemanticBinding): string =>
  binding.exclusiveGroup?.trim() || '기본 그룹'
