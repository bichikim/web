import {
  type DeepPosition,
  DEFAULT_CONNECTOR,
  DEFAULT_ID,
  DEFAULT_KEY_OPTIONS,
  DEFAULT_SEPARATOR,
  getDeepPositionKey,
  getNextPosition,
  getParentPosition,
  type KeyDeepPositionOptions,
  type KeyOptions,
  type Position,
} from './deep-position'
import type {Direction} from './direction'

export const DEFAULT_MAX_SEARCH_LENGTH = 10
export const DEFAULT_LIMIT_OVER_DEPTH = 5

export const DEFAULT_POSITION: Position = {x: 0, y: 0}
export const DEFAULT_MOVE_OPTIONS: Required<MoveOptions> = {
  ...DEFAULT_KEY_OPTIONS,
  limit: DEFAULT_MAX_SEARCH_LENGTH,
  tornadoSearch: false,
}

export const DEFAULT_FILL_OPTIONS: Required<FillOptions> = {
  ...DEFAULT_KEY_OPTIONS,
  defaultPosition: DEFAULT_POSITION,
  limit: DEFAULT_MAX_SEARCH_LENGTH,
  limitOverDepth: DEFAULT_LIMIT_OVER_DEPTH,
}

export const DEFAULT_JUMP_OPTIONS: Required<JumpOptions> = {
  ...DEFAULT_MOVE_OPTIONS,
  defaultPosition: DEFAULT_POSITION,
  jumpLimitIndex: 0,
  limit: DEFAULT_MAX_SEARCH_LENGTH,
  limitOverDepth: DEFAULT_LIMIT_OVER_DEPTH,
}

export interface DeepPositionInfo extends DeepPositionPayload {
  // registered count
  count: number
  /**
   * 자기 자신의 좌표로써 등록한 횟수
   */
  countAsSelf?: number
}

export interface RegisterDeepPositionOptions extends KeyDeepPositionOptions {
  /**
   * 자기 자신의 좌표로써 등록합니다.
   */
  asSelf?: boolean
  /**
   * count 를 증가시키지 않습니다.
   */
  noIncrementCount?: boolean
}

export interface MoveOptions extends KeyOptions {
  limit?: number
  tornadoSearch?: boolean
}

export interface FillOptions extends KeyOptions {
  defaultPosition?: Position
  /**
   * 방향으로 이동하여 찾을 최대 길이
   */
  limit?: number
  /**
   * 시작 지점 deep position 보다 더 깊은 곳까지 채워야 할 경우 시도할 최대 길이
   * @default 5
   */
  limitOverDepth?: number
}

export interface JumpOptions extends MoveOptions, FillOptions {
  defaultPosition?: Position
  jumpLimitIndex?: number
}

export interface PreventMoveFocusOptions {
  bottom?: boolean
  left?: boolean
  right?: boolean
  top?: boolean
}

export interface DeepPositionPayload {
  inactive?: boolean
  preventMoveFocus?: PreventMoveFocusOptions
  previousChildPosition?: Position
}

export interface UnregisterDeepPositionKeyOptions {
  /**
   * 삭제시 정보도 삭제합니다.
   */
  cleanUpInfo?: boolean
  /**
   * 등록된 count 가 0이 되면 정보도 삭제합니다.
   */
  cleanUpWhenZero?: boolean
}

export interface UnregisterDeepPositionOptions extends UnregisterDeepPositionKeyOptions, KeyOptions {
  //
}

export type PositionMap = Map<string, DeepPositionInfo>

export const createPositionMap = (): PositionMap => {
  return new Map<string, DeepPositionInfo>()
}

export const hasDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  return hasDeepPositionWithKey(positionMap, getDeepPositionKey(deepPosition, options))
}

export const hasDeepPositionAsSelf = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  return hasDeepPositionWithKey(positionMap, getDeepPositionKey(deepPosition, options), 'countAsSelf')
}

export const hasDeepPositionWithKey = (
  positionMap: PositionMap,
  key: string,
  countTarget: 'count' | 'countAsSelf' = 'count',
) => {
  const savedDeepPosition = positionMap.get(key)
  const count = savedDeepPosition?.[countTarget] ?? 0

  if (savedDeepPosition?.inactive) {
    return false
  }

  return count > 0
}

export const getRecursiveDeepPosition = (deepPosition: DeepPosition) => {
  if (deepPosition.length === 0) {
    return []
  }

  const deepPositionList = [deepPosition]
  const nextDeepPosition: DeepPosition = [...deepPosition]

  while (nextDeepPosition.length > 0) {
    nextDeepPosition.pop()
    deepPositionList.push([...nextDeepPosition])
  }

  return deepPositionList
}

export const registerDeepPositionRecursively = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  payload: DeepPositionPayload = {},
  options: KeyOptions = DEFAULT_KEY_OPTIONS,
) => {
  const deepPositionList = getRecursiveDeepPosition(deepPosition)

  const [targetDeepPosition] = deepPositionList.splice(0, 1)

  if (targetDeepPosition) {
    registerDeepPosition(positionMap, targetDeepPosition, payload, options)
  }

  for (const deepPosition of deepPositionList) {
    registerDeepPosition(positionMap, deepPosition, {}, options)
  }
}

export const registerDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  payload: DeepPositionPayload = {},
  options: RegisterDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  return registerDeepPositionWithKey(positionMap, getDeepPositionKey(deepPosition, options), payload, options)
}

export const registerDeepPositionWithKey = (
  positionMap: PositionMap,
  key: string,
  payload: DeepPositionPayload = {},
  options: Pick<RegisterDeepPositionOptions, 'noIncrementCount' | 'asSelf'> = {},
) => {
  const {noIncrementCount = false, asSelf = false} = options

  const savedDeepPosition = positionMap.get(key)
  const count = savedDeepPosition?.count ?? 0
  const countAsSelf = savedDeepPosition?.countAsSelf ?? 0

  const addCount = noIncrementCount ? 0 : 1
  const addCountAsSelf = asSelf ? 1 : 0

  return positionMap.set(key, {
    ...savedDeepPosition,
    count: count + addCount,
    countAsSelf: countAsSelf + addCountAsSelf,
    ...payload,
  })
}

export const unregisterDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  options: UnregisterDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  return unregisterDeepPositionWithKey(positionMap, getDeepPositionKey(deepPosition, options), options)
}

export const unregisterDeepPositionWithKey = (
  positionMap: PositionMap,
  key: string,
  options: UnregisterDeepPositionKeyOptions = {},
): boolean => {
  const {cleanUpInfo = false, cleanUpWhenZero = false} = options
  let savedDeepPosition = positionMap.get(key)
  const count = savedDeepPosition?.count ?? 0

  if (count === 0) {
    return false
  }

  if (count === 1 && cleanUpWhenZero) {
    savedDeepPosition = undefined
  } else if (cleanUpInfo) {
    savedDeepPosition = undefined
  }

  positionMap.set(key, {
    ...savedDeepPosition,
    count: count - 1,
  })

  return true
}

export const unregisterDeepPositionRecursively = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  options: UnregisterDeepPositionOptions = {},
) => {
  const deepPositionList = getRecursiveDeepPosition(deepPosition)

  const results = deepPositionList.map((deepPosition) => {
    return unregisterDeepPosition(positionMap, deepPosition, options)
  })

  return results.every(Boolean)
}

export const updateDeepPositionPayload = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  payload: DeepPositionPayload,
  options: KeyOptions = DEFAULT_KEY_OPTIONS,
) => {
  const key = getDeepPositionKey(deepPosition, options)

  return updateDeepPositionPayloadWithKey(positionMap, key, payload)
}

export const updateDeepPositionPayloadWithKey = (
  positionMap: PositionMap,
  key: string,
  payload: DeepPositionPayload,
) => {
  const savedDeepPosition = positionMap.get(key)

  if (!savedDeepPosition) {
    registerDeepPositionWithKey(positionMap, key, payload, {noIncrementCount: true})

    return
  }

  positionMap.set(key, {
    ...savedDeepPosition,
    ...payload,
  })
}

export const getNextDeepPosition = (deepPosition: DeepPosition, deepIndex: number, direction: Direction) => {
  if (deepIndex < 0 || deepIndex >= deepPosition.length) {
    return null
  }

  const position = deepPosition[deepIndex]
  const nextPosition = getNextPosition(position, direction)
  const nextDeepPosition = [...deepPosition]

  nextDeepPosition[deepIndex] = nextPosition

  return nextDeepPosition
}

/**
 * move deep position
 * @param positionMap - The position map to search in.
 * @param deepPosition - The deep position to move.
 * @param deepIndex - The index of the deep position to move.
 * @param direction - The direction to move.
 * @param limit - The limit of the search.
 * @param separator - The separator between x and y.
 * @param connector - The connector between positions.
 * @returns The moved deep position or null if not found.
 */
export const moveDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  deepIndex: number,
  direction: Direction,
  options: MoveOptions = DEFAULT_MOVE_OPTIONS,
): DeepPosition | null => {
  let nextDeepPosition: DeepPosition = deepPosition
  const {limit = DEFAULT_MAX_SEARCH_LENGTH} = options

  for (let tryCount = 0; tryCount < limit; tryCount += 1) {
    const newNextDeepPosition = getNextDeepPosition(nextDeepPosition, deepIndex, direction)

    if (newNextDeepPosition === null) {
      return null
    }

    if (hasDeepPosition(positionMap, newNextDeepPosition, options)) {
      return newNextDeepPosition
    }

    nextDeepPosition = newNextDeepPosition
  }

  return null
}

/**
 * deepPosition 이 존제할 경우엔 deepPosition 그대로 반환 아니라면 다음 deepPosition 을 찾는다
 */
export const findNextDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  deepIndex: number,
  direction: Direction,
  options: MoveOptions = DEFAULT_MOVE_OPTIONS,
) => {
  if (hasDeepPosition(positionMap, deepPosition, options)) {
    return deepPosition
  }

  return moveDeepPosition(positionMap, deepPosition, deepIndex, direction, options)
}

export const getDeepPositionInfo = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  options: KeyOptions = DEFAULT_KEY_OPTIONS,
) => {
  return getDeepPositionInfoWithKey(positionMap, getDeepPositionKey(deepPosition, options))
}

export const getDeepPositionInfoWithKey = (positionMap: PositionMap, key: string): DeepPositionInfo | undefined => {
  return positionMap.get(key)
}

export const getParentInfo = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  deepIndex: number,
  options: Readonly<KeyOptions> = DEFAULT_KEY_OPTIONS,
) => {
  return getDeepPositionInfo(positionMap, getParentPosition(deepPosition, deepIndex), options)
}

export const getPreviousPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  deepIndex: number,
  options: Readonly<FillOptions> = DEFAULT_FILL_OPTIONS,
): Position => {
  const {defaultPosition = DEFAULT_POSITION} = options
  const parentInfo = getParentInfo(positionMap, deepPosition, deepIndex, options)

  return parentInfo?.previousChildPosition ?? defaultPosition
}

/**
 * 대상 deep index 값을 기억하고 있는 이전 deep position 으로 복원
 * @param positionMap
 * @param deepPosition
 * @param deepIndex
 * @param separator
 * @param connector
 * @returns
 */
export const restoreDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  deepIndex: number,
  direction?: Direction,
  options: FillOptions = DEFAULT_FILL_OPTIONS,
): DeepPosition | null => {
  const _direction = direction ?? {x: 0, y: 0}
  const _deepPosition = [...deepPosition]

  _deepPosition.splice(deepIndex, _deepPosition.length)
  const previousPosition = getPreviousPosition(positionMap, deepPosition, deepIndex, options)

  const nextDeepPosition = [..._deepPosition]

  nextDeepPosition[deepIndex] = previousPosition

  return findNextDeepPosition(positionMap, nextDeepPosition, deepIndex, _direction, options)
}

export const fillPreviousDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  startDeepIndex: number,
  direction?: Direction,
  deepPositionLength: number = deepPosition.length,
  options: FillOptions = DEFAULT_FILL_OPTIONS,
  // eslint-disable-next-line max-params
): DeepPosition => {
  const _direction = direction ?? {x: 0, y: 0}
  const {limitOverDepth = DEFAULT_LIMIT_OVER_DEPTH} = options
  let nextDeepPosition: DeepPosition = deepPosition
  let deepIndex = startDeepIndex

  while (deepIndex < deepPositionLength) {
    const newNextDeepPosition = restoreDeepPosition(positionMap, nextDeepPosition, deepIndex, _direction, options)

    // fill 할 위치가 없을 경우 없는 위치 상위 부모 죄표까지만 반환
    if (newNextDeepPosition === null) {
      nextDeepPosition.splice(deepIndex, nextDeepPosition.length)

      return nextDeepPosition
    }

    nextDeepPosition = newNextDeepPosition
    deepIndex += 1
  }

  // nextDeepPosition 가 자기 자신의 좌표 로 등록 되어 있지 않을 경우
  if (limitOverDepth === 0 || hasDeepPositionAsSelf(positionMap, nextDeepPosition, options)) {
    return nextDeepPosition
  }

  // 더 깊이 찾는다
  return fillPreviousDeepPosition(positionMap, nextDeepPosition, deepIndex, direction, deepPositionLength + 1, {
    ...options,
    limitOverDepth: limitOverDepth - 1,
  })
}

/**
 * move and jump deep position
 * @param positionMap - The position map to search in.
 * @param deepPosition - The deep position to move.
 * @param direction - The direction to move.
 * @param separator - The separator between x and y.
 * @param connector - The connector between positions.
 * @returns The moved deep position or null if not found.
 */
export const jumpDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  direction: Direction,
  options: JumpOptions = DEFAULT_JUMP_OPTIONS,
): DeepPosition | null => {
  const {jumpLimitIndex = 0} = options

  const currentDeepPosition = [...deepPosition]

  for (let deepIndex = deepPosition.length - 1; deepIndex >= jumpLimitIndex; deepIndex -= 1) {
    const nextDeepPosition = moveDeepPosition(positionMap, currentDeepPosition, deepIndex, direction, options)

    if (nextDeepPosition) {
      return fillPreviousDeepPosition(
        positionMap,
        nextDeepPosition,
        deepIndex + 1,
        direction,
        deepPosition.length,
        options,
      )
    }

    currentDeepPosition.pop()
  }

  return null
}

export const savePreviousDeepPosition = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  options: KeyOptions = DEFAULT_KEY_OPTIONS,
) => {
  const {separator = DEFAULT_SEPARATOR, connector = DEFAULT_CONNECTOR} = options
  const deepPositionList = getRecursiveDeepPosition(deepPosition)

  // remove root deep position
  deepPositionList.pop()

  for (const targetDeepPosition of deepPositionList) {
    const _targetDeepPosition = [...targetDeepPosition]
    const previousPosition = _targetDeepPosition.pop()

    const targetKey = getDeepPositionKey(_targetDeepPosition, options)

    updateDeepPositionPayloadWithKey(positionMap, targetKey, {previousChildPosition: previousPosition})
  }
}

export const isPreventMoveFocus = (
  positionMap: PositionMap,
  deepPosition: DeepPosition,
  direction: Direction,
  options: KeyOptions = DEFAULT_KEY_OPTIONS,
) => {
  const key = getDeepPositionKey(deepPosition, options)
  const deepPositionInfo = getDeepPositionInfoWithKey(positionMap, key)

  if (!deepPositionInfo) {
    return false
  }

  const {preventMoveFocus: {bottom, left, right, top} = {}} = deepPositionInfo

  if (direction.x < 0 && left) {
    return true
  }

  if (direction.x > 0 && right) {
    return true
  }

  if (direction.y < 0 && top) {
    return true
  }

  if (direction.y > 0 && bottom) {
    return true
  }

  return false
}
