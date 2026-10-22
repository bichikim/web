import type {PuppetGlue, PuppetParameterBinding} from '../player/document'
import {getDirectGlueIds} from './get-direct-glue-ids'

/** 직접 Glue 대상과 기존 파트 연결을 함께 판정한다. */
export const isParameterGlueTarget = (binding: PuppetParameterBinding, glue: PuppetGlue): boolean =>
  getDirectGlueIds(binding).includes(glue.id) ||
  (binding.targetPartIds?.includes(glue.first.partId) ??
    binding.keyforms.some((form) => form.parts.some((part) => part.partId === glue.first.partId)))
