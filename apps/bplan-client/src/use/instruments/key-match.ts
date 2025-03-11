import {flatten} from '@winter-love/lodash'

interface FlatData {
  fullName: string
  key: number
  name: string
}

interface SharpData {
  fullName: string
  key: number
  name: string
  rightEmpty?: boolean
}

const keyLoopCount = 12
const keyFlatOffset = 4
const keySharpOffset = 5

export const flatSet: FlatData[] = flatten(
  Array.from<Omit<FlatData, 'fullName'>[]>({length: 14})
    .fill([
      {key: 2, name: 'A'},
      {key: 4, name: 'B'},
      {key: 5, name: 'C'},
      {key: 7, name: 'D'},
      {key: 9, name: 'E'},
      {key: 10, name: 'F'},
      {key: 12, name: 'G'},
    ])
    .map((item, setIndex) => {
      return item.map(({key, name}) => {
        const _key = key + setIndex * keyLoopCount
        const setName = `${name}${setIndex - 1}`

        return {fullName: setName, key: _key, name: setName}
      })
    }),
)
flatSet.splice(keyFlatOffset * -1)

export const sharpSet: SharpData[] = flatten(
  Array.from<Omit<SharpData, 'fullName'>[]>({length: 14})
    .fill([
      {key: 1, name: 'G#'},
      {key: 3, name: 'A#', rightEmpty: true},
      {key: 0, name: 'empty'},
      {key: 6, name: 'C#'},
      {key: 8, name: 'D#', rightEmpty: true},
      {key: 0, name: 'empty'},
      {key: 11, name: 'F#'},
    ])
    .map((item, setIndex) => {
      return item.map(({name, rightEmpty, key}) => ({
        fullName: `${name}${setIndex - 1}`,
        key: key + setIndex * keyLoopCount,
        name,
        rightEmpty,
      }))
    }),
)
sharpSet.shift()
sharpSet.splice(keySharpOffset * -1)

export const noteMatchMap = new Map<string, number | string>(
  [...flatSet, ...sharpSet].map((item) => {
    return [item.fullName, item.key]
  }),
)
