export interface Point {
  x: number
  y: number
}

export type Direction = Point

export type FocusPosition = Point[]

export interface PositionMap<Info extends Record<any, any>> {
  members: Set<string>
  positions: Map<string, PointInfo<Info>>
}

export interface PointInfo<Info extends Record<any, any>> {
  deleteMember: (id: string) => void
  getInfo: () => Info
  hasMembers: () => boolean
  setMember: (id: string) => void
  updateInfo: (update: (info: Info) => Info) => void
}

export type AbstractInfo = Partial<Record<any, any>>

export const stringifyPoint = (point: Point): string => {
  return `${point.x},${point.y}`
}

export const parsePoint = (pointString: string): Point => {
  const [x, y] = pointString.split(',').map(Number)
  return {x, y}
}

export const stringifyFocusPosition = (focusPosition: FocusPosition) => {
  return focusPosition.map(stringifyPoint).join('|')
}

export const parseFocusPosition = (focusPositionString: string): FocusPosition => {
  return focusPositionString.split('|').map(parsePoint)
}

export const createPositionMap = <Info extends AbstractInfo>(): PositionMap<Info> => {
  return {
    members: new Set(),
    positions: new Map(),
  }
}

export const createPointInfo = <Info extends AbstractInfo>(
  info: Info,
): PointInfo<Info> => {
  const members = new Set<string>()
  let _info: Info = {...info}

  const hasMembers = () => {
    return members.size > 0
  }
  const setMember = (id: string) => {
    members.add(id)
  }
  const deleteMember = (id: string) => {
    members.delete(id)
  }

  const updateInfo = (update: (info: Info) => Info) => {
    _info = update(_info)
  }

  const getInfo = () => {
    return {..._info}
  }

  return {
    deleteMember,
    getInfo,
    hasMembers,
    setMember,
    updateInfo,
  }
}

export const addEachFocusPosition = <Info extends AbstractInfo>(
  positions: Map<string, PointInfo<Info>>,
  focusPosition: FocusPosition,
  id: string,
  initInfo: Info = ({} as Info),
) => {
  const focusPositionKey = stringifyFocusPosition(focusPosition)
  const currentInfo = positions.get(focusPositionKey)
  if (currentInfo) {
    currentInfo.setMember(id)
    return
  }
  const info = createPointInfo(initInfo)
  info.setMember(id)
  positions.set(focusPositionKey, info)
}

export const addFocusPosition = <Info extends AbstractInfo>(
  map: PositionMap<Info>,
  focusPosition: FocusPosition,
  id: string,
) => {
  const positions = new Map(map.positions)

  const currentReadingFocusPosition = [...focusPosition]
  while (currentReadingFocusPosition.length > 0) {
    addEachFocusPosition(positions, currentReadingFocusPosition, id)
    currentReadingFocusPosition.splice(-1, 1)
  }
}
