export interface SpringSettings {
  readonly proportions: number
  readonly faceWidth: number
}

interface SpringTarget {
  readonly name: string
  influence: number
}

interface SpringContainer {
  readonly meshes: ReadonlyArray<{
    readonly morphTargetManager?: {
      readonly numTargets: number
      getTarget(index: number): SpringTarget
    } | null
  }>
}

export const SPRING_MODEL_URL = '/character-studio/spring.glb'
export const DEFAULT_SPRING: SpringSettings = {faceWidth: 0, proportions: 0}

export const applySpringSettings = (
  container: SpringContainer | null,
  settings: SpringSettings = DEFAULT_SPRING,
) => {
  container?.meshes.forEach((mesh) => {
    const manager = mesh.morphTargetManager
    if (manager === null || manager === undefined) {
      return
    }
    for (let index = 0; index < manager.numTargets; index += 1) {
      const target = manager.getTarget(index)
      if (target.name === 'SpringProportions') {
        target.influence = settings.proportions
      } else if (target.name === 'SpringFaceWidth') {
        target.influence = settings.faceWidth
      }
    }
  })
}
