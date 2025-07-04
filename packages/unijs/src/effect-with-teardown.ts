import {effect, setCurrentSub} from 'alien-signals'
import {untrack} from './untrack'

interface HiddenArg {
  __isHiddenArg: true
}

type Bucket = Set<any>

let __teardownBucket: Bucket | null = null
let __compareBucket: Bucket | null = null

/**
 * teardown 는 effect 가 시작 하기전에 이전 지정된 teardown logic을 호출 합니다
 * @param teardown
 */
export function teardown(teardown: () => void) {
  __teardownBucket?.add(teardown)
}

/**
 * compare 는 effect 가 끝난후 이전 리턴된 prevValue 와 함께 지정된 compare logic을 호출 합니다
 * effect 가 일어 날때마다 과거 값과 비교하여 실행할때 유용 합니다
 * @param compare
 */
export const compare = (compare: (prevValue: any) => void) => {
  __compareBucket?.add(compare)
}

export const effectWithTeardown = (recipe: () => void) => {
  const myTeardownBucket: Set<any> = new Set()
  const myCompareBucket: Set<any> = new Set()
  let __prevEffectReturn: any

  return effect(() => {
    untrack(() => {
      for (const teardown of myTeardownBucket) {
        // untrack effect in teardown
        teardown()
      }
    })
    myTeardownBucket.clear()
    __teardownBucket = myTeardownBucket
    __compareBucket = myCompareBucket
    const result = recipe()

    untrack(() => {
      for (const compare of myCompareBucket) {
        compare(__prevEffectReturn)
      }
    })
    myCompareBucket.clear()
    __compareBucket = null
    __teardownBucket = null
    __prevEffectReturn = result
  })
}
