const isEventPropMap = {
  onBlur: 'blur',
  onClick: 'click',
  onFocus: 'focus',
  onInput: 'input',
  onKeyDown: 'keydown',
  onKeyPress: 'keypress',
  onKeyUp: 'keyup',
  onMouseDown: 'mousedown',
  onMouseEnter: 'mouseenter',
  onMouseLeave: 'mouseleave',
  onMouseMove: 'mousemove',
  onMouseOut: 'mouseout',
  onMouseOver: 'mouseover',
  onMouseUp: 'mouseup',
  onTouchCancel: 'touchcancel',
  onTouchEnd: 'touchend',
  onTouchEnter: 'touchenter',
  onTouchLeave: 'touchleave',
  onTouchMove: 'touchmove',
  onTouchStart: 'touchstart',
}

// 커스텀 이벤트 지원 필요 커스텀 이벤트는 on:xxx 로 이름 규칙 추가 필요
// preventDefault 지원 필요 예 {onClick: {preventDefault: true, handle: (event) => {...}}}
/**
 *
 * @example
 * const onClick = event(() => {}, {preventDefault: true}) // 이건 이것과 같음 -> const onClick = {preventDefault: true, handle: (event) => {...}}
 * const onClick = event.preventDefault(() => {}) // 이렇게 써도 될듯
 */

export const getEventPropName = (prop: string): string | undefined => {
  const name = isEventPropMap[prop as keyof typeof isEventPropMap]

  if (name) {
    return name
  }

  const [_, rest] = prop.split('on:')

  if (rest) {
    return rest
  }
}
