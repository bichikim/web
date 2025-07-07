import {effect, setCurrentSub} from 'alien-signals'
import {untrack} from './untrack'

interface HiddenArg {
  __isHiddenArg: true
}

type Bucket = Set<any>

let __teardownBucket: Bucket | null = null

/**
 * teardown 는 effect 가 시작 하기전에 이전 지정된 teardown logic을 호출 합니다
 * @param teardown
 */
export function teardown(teardown: () => void) {
  __teardownBucket?.add(teardown)
}

export const effectWithTeardown = <T>(recipe: (prevValue?: T) => T) => {
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
    const result = recipe(__prevEffectReturn)

    myCompareBucket.clear()
    __teardownBucket = null
    __prevEffectReturn = result
  })
}
