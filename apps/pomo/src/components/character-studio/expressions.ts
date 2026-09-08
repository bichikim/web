export interface ExpressionSettings {
  readonly emotion: string
  readonly emotionWeight: number
  readonly mouth: string
  readonly mouthWeight: number
  readonly blink: number
}

interface ExpressionTarget {
  readonly name: string
  influence: number
}
interface ExpressionContainer {
  readonly meshes: ReadonlyArray<{
    readonly morphTargetManager?: {
      readonly numTargets: number
      getTarget(index: number): ExpressionTarget
    } | null
  }>
}

export const DEFAULT_EXPRESSIONS: ExpressionSettings = {
  blink: 0,
  emotion: '',
  emotionWeight: 1,
  mouth: '',
  mouthWeight: 1,
}

const MOUTH_TARGETS = new Set(['Fcl_MTH_A', 'Fcl_MTH_I', 'Fcl_MTH_U', 'Fcl_MTH_E', 'Fcl_MTH_O'])

export const applyExpressions = (
  container: ExpressionContainer | null,
  settings: ExpressionSettings = DEFAULT_EXPRESSIONS,
) => {
  container?.meshes.forEach((mesh) => {
    const manager = mesh.morphTargetManager
    if (manager === null || manager === undefined) {
      return
    }
    for (let index = 0; index < manager.numTargets; index += 1) {
      const target = manager.getTarget(index)
      if (target.name.startsWith('Fcl_ALL_')) {
        target.influence =
          target.name === `Fcl_ALL_${settings.emotion}` ? settings.emotionWeight : 0
      } else if (MOUTH_TARGETS.has(target.name)) {
        target.influence = target.name === `Fcl_MTH_${settings.mouth}` ? settings.mouthWeight : 0
      } else if (target.name === 'Fcl_EYE_Close') {
        target.influence = settings.blink
      }
    }
  })
}
