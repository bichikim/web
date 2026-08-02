/** targets에서 from과 참조(===)가 같은 항목을 제외한 배열을 반환한다. */
export const targetsExcept = <Target>(from: Target, targets: readonly Target[]): Target[] => {
  return targets.filter((target) => target !== from)
}
