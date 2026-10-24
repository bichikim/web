import {
  createPositionMap,
  getDeepPositionInfoWithKey,
  hasDeepPositionWithKey,
  isPreventMoveFocus,
  jumpDeepPosition,
  type JumpOptions,
  moveDeepPosition,
  type MoveOptions,
  type PositionMap,
  type PreventMoveFocusOptions,
  registerDeepPositionRecursively,
  savePreviousDeepPosition,
  unregisterDeepPositionRecursively,
  updateDeepPositionPayload,
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

export interface FocusController {
  /**
   * focusController 를 활성화 또는 비활성화 합니다.
   * @param value
   */
  readonly active: (value: boolean) => void
  /**
   * 포커스 좌표를 반환합니다.
   */
  readonly deepPosition: DeepPosition
  /**
   * 포커스 좌표를 이동합니다.
   * @param direction
   * @param options
   */
  readonly moveFocus: (direction: Direction, options?: MoveFocusOptions) => DeepPosition | null
  /**
   * 포커스 좌표 맵을 반환합니다.
   */
  readonly positionMap: PositionMap
  /**
   * 포커스 좌표를 등록합니다.
   * @param deepPosition
   */
  readonly registerFocus: (deepPosition: DeepPosition) => void

  /**
   * deepPosition 좌표를 활성화 또는 비활성화 합니다.
   * 비활성화 되면 hasDeepPosition 이 false 가 되어 moveFocus 에서 대상 위치가 되지 않습니다
   * @param deepPosition
   * @param value
   */
  readonly setActiveFocus: (deepPosition: DeepPosition, value: boolean) => void
  /**
   * 포커스 좌표를 설정합니다.
   * @param deepPosition
   * @param options
   */
  readonly setFocus: (deepPosition: DeepPosition, options?: SetFocusOptions) => void
  /**
   * 포커스 좌표를 이동할 때 포커스 이동을 막습니다.
   * @param deepPosition
   * @param value
   */
  readonly setPreventMoveFocus: (deepPosition: DeepPosition, value: PreventMoveFocusOptions) => void
  /**
   * 이전 포커스 좌표를 저장합니다.
   * @param deepPosition
   */
  readonly setPreviousFocus: (deepPosition: DeepPosition) => void
  /**
   * 포커스 좌표를 등록해제합니다
   * @param deepPosition
   */
  readonly unregisterFocus: (deepPosition: DeepPosition) => void
}

/**
 * focusController 를 생성합니다.
 * @param {Function} onChangeFocus - 포커스 좌표가 변경될 때 호출됩니다.
 * @returns {FocusController} focusController
 */
export const createFocusController = (
  onChangeFocus?: (deepPosition: DeepPosition, focused: boolean) => void,
): FocusController => {
  let _active = true
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

    const _previousDeepPosition = [..._deepPosition]

    // focusController 가 비활성화 되어 있으면 포커스 변경을 막습니다.
    if (!ignoreFocusControllerActive && !_active) {
      return
    }

    // 포커스 좌표가 등록되어 있지 않으면 포커스 변경을 막습니다.
    const hasDeepPosition = ignoreHasDeepPosition
      ? true
      : hasDeepPositionWithKey(_positionMap, getDeepPositionKey(deepPosition))

    if (!hasDeepPosition) {
      return
    }

    if (!preventSavePreviousFocus) {
      setPreviousFocus(_deepPosition)
    }

    // clone and save
    _deepPosition = [...deepPosition]

    if (!preventCallChangeFocus) {
      onChangeFocus?.(_previousDeepPosition, false)
      onChangeFocus?.(_deepPosition, true)
    }
  }

  const moveFocus = (direction: Direction, options: MoveFocusOptions = {}) => {
    const {ignorePreventMoveFocus = false} = options

    // 지금 포커스 좌표가 direction 으로 이동할 수 없는 경우 이동하지 않습니다.
    if (
      !ignorePreventMoveFocus &&
      isPreventMoveFocus(_positionMap, _deepPosition, direction, options)
    ) {
      return null
    }

    // 다음 포커스 좌표를 찾습니다.
    const nextDeepPosition = jumpDeepPosition(_positionMap, _deepPosition, direction, options)

    // 다음 포커스 좌표가 있으면 포커스 좌표를 설정합니다.
    if (nextDeepPosition) {
      setFocus(nextDeepPosition, {
        ...options,
        // ignoreHasDeepPosition 설정이 없을 경우 jumpDeepPosition 에서 이미 확인한 부분이기 때문에
        // HasDeepPosition 를 무시합니다
        ignoreHasDeepPosition: options.ignoreHasDeepPosition ?? true,
      })
    }

    return nextDeepPosition
  }

  const setActiveFocus = (deepPosition: DeepPosition, value: boolean) => {
    updateDeepPositionPayload(_positionMap, deepPosition, {inactive: !value})
  }

  const setPreventMoveFocus = (deepPosition: DeepPosition, value: PreventMoveFocusOptions) => {
    updateDeepPositionPayload(_positionMap, deepPosition, {preventMoveFocus: value})
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
    deepPosition: _deepPosition,
    moveFocus,
    positionMap: _positionMap,
    registerFocus,
    setActiveFocus,
    setFocus,
    setPreventMoveFocus,
    setPreviousFocus,
    unregisterFocus,
  }
}
