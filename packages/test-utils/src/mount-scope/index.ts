import {effectScope} from 'vue'

export type MountScopeRunningCode<T> = (...args) => T

export interface MountScopeResult<T> {
  result: NonNullable<T>
  stop: (fromParent?: boolean) => void
}

/**
 * Scope 안에서 mount 합니다 (onMounted 같은 vue component 전용을 테스트 할 수 없습니다 mount-composition 을 사용하세요)
 * @param runningCode
 */
export const mountScope = <T>(runningCode: MountScopeRunningCode<T>) => {
  const scope = effectScope()

  const result = scope.run(runningCode)

  return {
    result,
    stop: () => {
      return scope.stop()
    },
  }
}
