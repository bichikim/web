import type {PuppetParameterBinding} from '../player/document'

/** 명시한 Glue 대상을 우선하고, 없으면 직접 키폼의 ID를 중복 없이 반환한다. */
export const getDirectGlueIds = (binding: PuppetParameterBinding): ReadonlyArray<string> =>
  binding.targetGlueIds ?? [
    ...new Set(binding.keyforms.flatMap((form) => form.glue?.map((sample) => sample.id) ?? [])),
  ]
