import {PUPPET_PHYSICS_AXES, type PuppetDocument} from '../../../player'

export const AXIS_LABELS = {angle: '각도', x: 'X 위치', y: 'Y 위치'} as const

export const isAxis = (value: string) => PUPPET_PHYSICS_AXES.find((axis) => axis === value)

export const RATIO_STEP = 0.05

export const parameterOptions = (document: PuppetDocument) =>
  (document.parameters ?? []).map((parameter) => parameter.id)

export const parameterLabel = (document: PuppetDocument) => (id: string) =>
  document.parameters?.find((parameter) => parameter.id === id)?.name ?? id
