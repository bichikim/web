export const FACE_CONTROLS = [
  {id: 'ear-size', initial: 0, label: '귀 크기', min: -1},
  {id: 'ear-tip-height', initial: 0, label: '귀 끝 위아래 조정', min: -1},
  {id: 'ear-tip-width', initial: 0, label: '귀 끝을 옆으로 넓히기', min: 0},
  {id: 'ear-direction', initial: 0, label: '귀 방향', min: -1},
  {id: 'ear-roundness', initial: 0, label: '귀 둥글게', min: 0},
  {id: 'ear-hide', initial: 0, label: '귀 숨기기', min: 0},
  {id: 'cheek-height', initial: -0.15, label: '뺨 높이 조정', min: -1},
  {id: 'cheek-depth', initial: 0, label: '뺨 앞뒤 조정', min: -1},
  {id: 'lower-cheek', initial: 0, label: '아래 볼 부풀리기', min: 0},
  {id: 'chin-roundness', initial: 0, label: '턱 둥글게 하기', min: 0},
  {id: 'chin-lower', initial: 0, label: '턱 내리기', min: 0},
  {id: 'chin-tip-height', initial: 0.449, label: '턱 끝 위아래 조정', min: -1},
  {id: 'chin-tip-depth', initial: 0, label: '턱 끝 앞뒤 조정', min: -1},
  {id: 'chin-tip-width', initial: 0, label: '턱 끝 가로폭', min: -1},
  {id: 'chin-reduce', initial: 0.568, label: '턱 줄이기', min: 0},
  {id: 'face-feminine', initial: 1, label: '얼굴 모양(여성)', min: 0},
  {id: 'face-masculine', initial: 0, label: '얼굴 모양(남성)', min: 0},
  {id: 'contour-feminine', initial: 0, label: '윤곽 모양(여성)', min: 0},
  {id: 'contour-masculine', initial: 0, label: '윤곽 모양(남성)', min: 0},
] as const

export type FaceSettings = Readonly<Partial<Record<(typeof FACE_CONTROLS)[number]['id'], number>>>

interface FaceContainer {
  readonly meshes: ReadonlyArray<{
    readonly morphTargetManager?: {
      readonly numTargets: number
      getTarget(index: number): {readonly name: string; influence: number}
    } | null
  }>
}

export const applyFaceDeformation = (
  container: FaceContainer | null,
  settings: FaceSettings = {},
) => {
  const weights = new Map<string, number>()
  for (const control of FACE_CONTROLS) {
    const input = settings[control.id] ?? control.initial
    const value = Number.isFinite(input)
      ? Math.min(1, Math.max(control.min, input))
      : control.initial
    weights.set(
      `PomoFace:${control.id}:plus`,
      value > control.initial ? (value - control.initial) / (1 - control.initial) : 0,
    )
    weights.set(
      `PomoFace:${control.id}:minus`,
      value < control.initial ? (control.initial - value) / (control.initial - control.min) : 0,
    )
  }
  container?.meshes.forEach((mesh) => {
    const manager = mesh.morphTargetManager
    if (manager === null || manager === undefined) {
      return
    }
    for (let index = 0; index < manager.numTargets; index += 1) {
      const target = manager.getTarget(index)
      const weight = weights.get(target.name)
      if (weight !== undefined) {
        target.influence = weight
      }
    }
  })
}
