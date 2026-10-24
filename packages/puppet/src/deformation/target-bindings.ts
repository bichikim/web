import type {PuppetParameterBinding} from '../player/document'

type TargetKind = 'targetPartIds' | 'targetDeformerIds' | 'targetGroupIds'

const indexes = new WeakMap<
  ReadonlyArray<PuppetParameterBinding>,
  Map<TargetKind, ReadonlyMap<string, ReadonlyArray<PuppetParameterBinding>>>
>()

/** 불변 바인딩의 명시적 대상을 종류별로 인덱싱한다. 중복 바인딩의 적용 순서는 유지한다. */
export const getTargetBindings = (
  bindings: ReadonlyArray<PuppetParameterBinding>,
  kind: TargetKind,
  subjectId: string,
): ReadonlyArray<PuppetParameterBinding> => {
  let kinds = indexes.get(bindings)
  if (kinds === undefined) {
    kinds = new Map()
    indexes.set(bindings, kinds)
  }
  let indexed = kinds.get(kind)
  if (indexed === undefined) {
    const subjects = new Map<string, PuppetParameterBinding[]>()
    for (const binding of bindings) {
      for (const id of new Set(binding[kind])) {
        const matching = subjects.get(id) ?? []
        matching.push(binding)
        subjects.set(id, matching)
      }
    }
    indexed = subjects
    kinds.set(kind, indexed)
  }
  return indexed.get(subjectId) ?? []
}
