interface ObjectUrlRuntime<Value extends object> {
  readonly create: (value: Value) => string
  readonly order?: 'create-first' | 'revoke-first'
  readonly revoke: (url: string) => void
}

/** Replaces an owned URL using the runtime's required creation order. */
export function replaceObjectUrl<Value extends object>(
  previous: string | null,
  getNext: () => Value,
  runtime: ObjectUrlRuntime<Value>,
): string
export function replaceObjectUrl<Value extends object>(
  previous: string | null,
  getNext: () => Value | null,
  runtime: ObjectUrlRuntime<Value>,
): string | null
export function replaceObjectUrl<Value extends object>(
  previous: string | null,
  getNext: () => Value | null,
  runtime: ObjectUrlRuntime<Value>,
): string | null {
  const createNext = () => {
    const next = getNext()
    return next === null ? null : runtime.create(next)
  }

  if (runtime.order === 'create-first') {
    const nextUrl = createNext()
    if (previous !== null) {
      runtime.revoke(previous)
    }
    return nextUrl
  }

  if (previous !== null) {
    runtime.revoke(previous)
  }
  return createNext()
}
