import {
  type PositionMap,
  type JumpOptions,
  type MoveOptions,
  jumpDeepPosition,
  moveDeepPosition,
  createPositionMap,
  savePreviousDeepPosition,
  updateDeepPositionPayload,
  getDeepPositionInfoWithKey,
  hasDeepPositionWithKey,
  registerDeepPositionRecursively,
  unregisterDeepPositionRecursively,
  isPreventMoveFocus,
} from './position-map'
import {type DeepPosition, getDeepPositionKey} from './deep-position'
import type {Direction} from './direction'

export interface SetFocusOptions {
  /**
   * focusController 가 active 가 아닌 경우 포커스 변경을 막지만 true 로 설정하면 포커스 변경을 허용합니다.
   */
  ignoreFocusControllerActive?: boolean
  /**
   * hasDeepPosition 이 false 인 경우 포커스 변경을 막지만 true 로 설정하면 포커스 변경을 허용합니다.
   */
  ignoreHasDeepPosition?: boolean
  /**
   * 포커스 변경 시 onChangeFocus 를 호출하지 않습니다.
   */
  preventCallChangeFocus?: boolean
  /**
   * 포커스 변경 시 previousFocus 를 저장하지 않습니다.
   */
  preventSavePreviousFocus?: boolean
}

export type MoveFocusOptions = JumpOptions &
  SetFocusOptions & {
    ignorePreventMoveFocus?: boolean
  }

export const createFocusController = (onChangeFocus?: (deepPosition: DeepPosition) => void) => {
  let _active = false
  const _positionMap = createPositionMap()
  let _deepPosition: DeepPosition = []

  const setPreviousFocus = (deepPosition: DeepPosition) => {
    savePreviousDeepPosition(_positionMap, deepPosition)
  }

  const setFocus = (deepPosition: DeepPosition, options: SetFocusOptions = {}) => {
    const {
      ignoreFocusControllerActive = false,
      ignoreHasDeepPosition = false,
      preventSavePreviousFocus = false,
      preventCallChangeFocus = false,
    } = options

    if (!ignoreFocusControllerActive && !_active) {
      return
    }

    const hasDeepPosition = hasDeepPositionWithKey(_positionMap, getDeepPositionKey(deepPosition))

    if (!ignoreHasDeepPosition && !hasDeepPosition) {
      return
    }

    if (!preventSavePreviousFocus) {
      setPreviousFocus(_deepPosition)
    }

    // clone and save
    _deepPosition = [...deepPosition]

    if (!preventCallChangeFocus) {
      onChangeFocus?.(_deepPosition)
    }
  }

  const moveFocus = (direction: Direction, options: MoveFocusOptions = {}) => {
    const {ignorePreventMoveFocus = false} = options

    if (!ignorePreventMoveFocus && isPreventMoveFocus(_positionMap, _deepPosition, direction, options)) {
      return
    }

    const newDeepPosition = jumpDeepPosition(_positionMap, _deepPosition, direction, options)

    if (newDeepPosition) {
      setFocus(newDeepPosition, options)
    }

    return newDeepPosition
  }

  /**
   * deepPosition 좌표를 활성화 또는 비활성화 합니다.
   * 비활성화 되면 hasDeepPosition 이 false 가 되어 moveFocus 에서 대상 위치가 되지 않습니다
   * @param deepPosition
   * @param value
   */
  const setActiveFocus = (deepPosition: DeepPosition, value: boolean) => {
    updateDeepPositionPayload(_positionMap, deepPosition, {inactive: !value})
  }

  const registerFocus = (deepPosition: DeepPosition) => {
    registerDeepPositionRecursively(_positionMap, deepPosition)
  }

  const unregisterFocus = (deepPosition: DeepPosition) => {
    unregisterDeepPositionRecursively(_positionMap, deepPosition)
  }

  const active = (value: boolean) => {
    _active = value
  }

  //
  return {
    active,
    deepPosition: [],
    moveFocus,
    positionMap: createPositionMap(),
    registerFocus,
    setActiveFocus,
    setFocus,
    setPreviousFocus,
    unregisterFocus,
  }
}
