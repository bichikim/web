export const completeSurfaceChanges = async (operations: readonly Promise<void>[]) => {
  const results = await Promise.allSettled(operations)
  const failures = results.filter((result) => result.status === 'rejected')
  if (failures.length === 1) {
    throw failures[0]!.reason
  }
  if (failures.length > 1) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      'Wallpaper surfaces failed',
    )
  }
}
