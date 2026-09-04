import type {PuppetParameterValues} from '../../deformation'

interface ParameterRestEditTarget {
  readonly kind: 'rest'
}

interface ParameterKeyformEditTarget {
  readonly bindingId: string
  readonly kind: 'keyform'
  readonly values: PuppetParameterValues
}

export type ParameterEditTarget = ParameterKeyformEditTarget | ParameterRestEditTarget

export interface GetParameterEditTargetOptions {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly editMode?: 'motion' | 'parameter'
  readonly nodeId: string
  readonly targetNodeIds?: ReadonlyArray<string>
}

export const getParameterEditTarget = (
  options: GetParameterEditTargetOptions,
): ParameterEditTarget => {
  if (
    options.editMode !== 'parameter' ||
    options.activeBindingId === undefined ||
    options.activeKeyformValues === undefined ||
    options.activeKeyformValues === null ||
    options.targetNodeIds?.includes(options.nodeId) !== true
  ) {
    return {kind: 'rest'}
  }

  return {
    bindingId: options.activeBindingId,
    kind: 'keyform',
    values: options.activeKeyformValues,
  }
}
