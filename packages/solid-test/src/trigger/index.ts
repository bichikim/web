export const createTrigger = () => {
  let _target: undefined | ((...args: any) => any)
  let _changed: number = 0

  return {
    get changed() {
      return _changed
    },
    run: () => {
      _target?.()
    },
    set target(callback: ((...args: any) => any) | undefined) {
      _target = callback
      _changed += 1
    },
    get target() {
      return _target
    },
  }
}
