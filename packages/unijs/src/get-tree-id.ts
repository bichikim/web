import {createGetId} from './get-id'

export const createGetTreeId = (parentId: string, startFrom: number = 0): (() => string) => {
  const getId = createGetId(startFrom)

  return () => {
    const id = getId()

    return `${parentId}:${id}`
  }
}
