import type {PuppetParameterValueMap} from '../../deformation'
import {resolveParameterValue} from '../parameter-value'
import type {PreparedPuppetDocument} from './prepared-document'

/** 문서에 존재하는 파라미터의 외부 값을 각 파라미터 범위에 맞춰 반환한다. */
export const resolveParameterOverrides = (
  document: PreparedPuppetDocument,
  values: PuppetParameterValueMap,
) =>
  Object.fromEntries(
    (document.parameters ?? [])
      .filter((parameter) => Object.hasOwn(values, parameter.id))
      .map((parameter) => [parameter.id, resolveParameterValue(parameter, values[parameter.id])]),
  )
