/** 정규화한 파라미터 공간과 편집 단면이 공유하는 화면 좌표계. */
export const VOLUME_PROJECTION = {
  bottom: 126,
  depthX: 88,
  depthY: 32,
  height: 90,
  left: 22,
  percent: 100,
  top: 36,
  viewportHeight: 140,
  viewportWidth: 260,
  width: 128,
} as const

/** 정규화한 XYZ 좌표를 육면체 화면 좌표로 투영한다. */
export const projectVolumePoint = (x: number, y: number, z: number) => [
  VOLUME_PROJECTION.left + x * VOLUME_PROJECTION.width + z * VOLUME_PROJECTION.depthX,
  VOLUME_PROJECTION.bottom - y * VOLUME_PROJECTION.height - z * VOLUME_PROJECTION.depthY,
]

/** 투영한 현재 단면의 시작 위치를 백분율로 반환한다. */
export const getVolumeSlicePosition = (depth: number) => ({
  left:
    ((VOLUME_PROJECTION.left + depth * VOLUME_PROJECTION.depthX) /
      VOLUME_PROJECTION.viewportWidth) *
    VOLUME_PROJECTION.percent,
  top:
    ((VOLUME_PROJECTION.top - depth * VOLUME_PROJECTION.depthY) /
      VOLUME_PROJECTION.viewportHeight) *
    VOLUME_PROJECTION.percent,
})
