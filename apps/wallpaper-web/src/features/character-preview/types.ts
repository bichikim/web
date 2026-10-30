export interface CharacterPoint {
  readonly clientX: number
  readonly clientY: number
}

/** 뷰포트 좌표의 포인터가 현재 그려진 캐릭터 픽셀 위에 있는지 검사한다. */
export type CharacterHitTest = (point: CharacterPoint) => boolean
