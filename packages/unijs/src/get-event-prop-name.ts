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

export const getEventPropName = (prop: string): string | undefined => {
  return isEventPropMap[prop as keyof typeof isEventPropMap]
}
