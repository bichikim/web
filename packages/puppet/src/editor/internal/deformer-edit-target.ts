import type {PuppetParameterValues} from '../../deformation'

interface DeformerRestEditTarget {
  readonly kind: 'rest'
}

interface DeformerKeyformEditTarget {
  readonly bindingId: string
  readonly kind: 'keyform'
  readonly values: PuppetParameterValues
}

export type DeformerEditTarget = DeformerKeyformEditTarget | DeformerRestEditTarget

export interface GetDeformerEditTargetOptions {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly editMode?: 'motion' | 'parameter'
  readonly nodeId: string
  readonly targetNodeIds?: ReadonlyArray<string>
}

export const getDeformerEditTarget = (
  options: GetDeformerEditTargetOptions,
): DeformerEditTarget => {
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
