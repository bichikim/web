/**
 * 뷰의 지정 위치부터 UTF-16 코드 단위의 하위 8비트를 차례로 쓴다.
 * 빈 문자열은 쓰지 않으며, 쓰기 실패 전까지 변경한 바이트는 유지한다.
 */
export const writeTextBytes = (view: DataView, offset: number, text: string): void => {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}
