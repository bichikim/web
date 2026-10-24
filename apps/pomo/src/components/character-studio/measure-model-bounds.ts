import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import type {Scene} from '@babylonjs/core/scene'

const CENTER_SCALE = 0.5

export interface ModelBounds {
  /** 추가 좌표 보정 없이 새로 계산한 경계 중심이다. */
  readonly center: Vector3
  /** 양수이며 유한한 경계 상자 대각선 길이다. */
  readonly diameter: number
}

/**
 * 빌린 장면과 모델에서 중심과 유효한 대각선 길이를 구하며, 측정할 수 없으면 null을 반환한다.
 * 자원 수명은 호출자가 유지하고, 기존 장면 조회·벡터 연산의 오류는 그대로 전파한다.
 */
export const measureModelBounds = (
  scene: Pick<Scene, 'getWorldExtends'>,
  container: Pick<AssetContainer, 'meshes'>,
): ModelBounds | null => {
  const modelMeshes = new Set(container.meshes.filter((mesh) => mesh.getTotalVertices() > 0))

  if (modelMeshes.size === 0) {
    return null
  }

  const {max, min} = scene.getWorldExtends((mesh) => modelMeshes.has(mesh))
  const center = min.add(max).scale(CENTER_SCALE)
  const diameter = Vector3.Distance(min, max)

  if (!Number.isFinite(diameter) || diameter <= 0) {
    return null
  }

  return {center, diameter}
}
