import {isTwoDimensionalParameterBinding} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterKeyform,
} from '../../player/document'

interface ResetParameterKeyformOptions<Keyform extends PuppetParameterKeyform> {
  readonly keyform: Keyform
  readonly partId: string
  readonly targetsPart: boolean
  readonly vertices: ReadonlyArray<number>
}

const resetParameterKeyform = <Keyform extends PuppetParameterKeyform>(
  options: ResetParameterKeyformOptions<Keyform>,
): Keyform => {
  if (!options.targetsPart) {
    return options.keyform
  }

  const hasPart = options.keyform.parts.some((part) => part.partId === options.partId)
  const resetPart = {partId: options.partId, vertices: options.vertices}

  return {
    ...options.keyform,
    parts: hasPart
      ? options.keyform.parts.map((part) => (part.partId === options.partId ? resetPart : part))
      : [...options.keyform.parts, resetPart],
  } as Keyform
}

const resetParameterBinding = (
  binding: PuppetParameterBinding,
  partId: string,
  vertices: ReadonlyArray<number>,
): PuppetParameterBinding => {
  const targetsPart =
    binding.targetPartIds?.includes(partId) ??
    binding.keyforms.some((keyform) => keyform.parts.some((part) => part.partId === partId))
  const resetKeyform = <Keyform extends PuppetParameterKeyform>(keyform: Keyform) =>
    resetParameterKeyform({keyform, partId, targetsPart, vertices})

  return isTwoDimensionalParameterBinding(binding)
    ? {...binding, keyforms: binding.keyforms.map(resetKeyform)}
    : {...binding, keyforms: binding.keyforms.map(resetKeyform)}
}

export const resetParameterPartKeyforms = (
  document: PuppetDocument,
  partId: string,
  vertices: ReadonlyArray<number>,
): PuppetDocument => ({
  ...document,
  parameterBindings: document.parameterBindings?.map((binding) =>
    resetParameterBinding(binding, partId, vertices),
  ),
})

export const resetPartDeformations = (
  document: PuppetDocument,
  partId: string,
  vertices: ReadonlyArray<number>,
): PuppetDocument => ({
  ...resetParameterPartKeyforms(document, partId, vertices),
  motions: document.motions.map((motion) => ({
    ...motion,
    tracks: motion.tracks.filter((track) => track.kind === 'parameter' || track.partId !== partId),
  })),
})
