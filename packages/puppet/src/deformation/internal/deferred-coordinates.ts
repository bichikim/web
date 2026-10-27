interface CreateDeferredCoordinatesOptions {
  /** Nonnegative integer coordinate count in this frame's immutable buffer. */
  readonly length: number
  /** Resolves an indexed coordinate on its first read; later reads reuse that value. */
  readonly sample: (index: number) => number
}

export type CoordinateReader = (index: number) => number | undefined
const readers = new WeakMap<ReadonlyArray<number>, CoordinateReader>()
const deferredBuffers = new WeakSet<ReadonlyArray<number>>()

/** Whether coordinates belong to an immutable runtime frame. */
export const isDeferredCoordinates = (coordinates: ReadonlyArray<number>): boolean =>
  deferredBuffers.has(coordinates)

/** Compiles indexed reads without going through the array adapter in numerical kernels. */
export const getCoordinateReader = (coordinates: ReadonlyArray<number>): CoordinateReader => {
  let read = readers.get(coordinates)
  if (read === undefined) {
    read = (index) => coordinates[index]
    readers.set(coordinates, read)
  }
  return read
}

const coordinateIndex = (property: string | symbol, length: number): number | undefined => {
  if (typeof property !== 'string') {
    return undefined
  }
  const index = Number(property)
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === property
    ? index
    : undefined
}

/** Indexed view of one immutable runtime coordinate buffer. */
interface CoordinateArrayOptions {
  /** Coordinate count exposed by the array adapter. */
  readonly length: number
  /** Reads one indexed value from this frame, including its sampling policy. */
  readonly read: CoordinateReader
}

const createCoordinateArray = (options: CoordinateArrayOptions): ReadonlyArray<number> => {
  const coordinates: number[] = []
  const {read} = options
  const materialize = (index: number) => {
    if (!Object.hasOwn(coordinates, index)) {
      coordinates[index] = read(index)!
    }
  }
  const deferred = new Proxy(coordinates, {
    get(target, property, receiver) {
      if (property === 'length') {
        return options.length
      }
      const index = coordinateIndex(property, options.length)
      return index === undefined ? Reflect.get(target, property, receiver) : read(index)
    },
    getOwnPropertyDescriptor(target, property) {
      if (property === 'length') {
        return {...Reflect.getOwnPropertyDescriptor(target, property)!, value: options.length}
      }
      const index = coordinateIndex(property, options.length)
      if (index !== undefined) {
        materialize(index)
      }
      return Reflect.getOwnPropertyDescriptor(target, property)
    },
    has: (target, property) =>
      coordinateIndex(property, options.length) !== undefined || Reflect.has(target, property),
    ownKeys(target) {
      for (let index = 0; index < options.length; index += 1) {
        materialize(index)
      }
      return Reflect.ownKeys(target)
    },
    preventExtensions(target) {
      for (let index = 0; index < options.length; index += 1) {
        materialize(index)
      }
      return Reflect.preventExtensions(target)
    },
  })
  readers.set(deferred, read)
  deferredBuffers.add(deferred)
  return deferred
}

const validateLength = (length: number): void => {
  const MAXIMUM_ARRAY_LENGTH = 0xffff_ffff
  if (!Number.isInteger(length) || length < 0 || length > MAXIMUM_ARRAY_LENGTH) {
    throw new RangeError('Invalid array length')
  }
}

/** Runtime-only coordinates; use Array.from to obtain an ordinary cloneable array. */
export const createDeferredCoordinates = (
  options: CreateDeferredCoordinatesOptions,
): ReadonlyArray<number> => {
  validateLength(options.length)
  const values = new Float64Array(options.length)
  const initialized = new Uint8Array(options.length)
  const read = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= options.length) {
      return undefined
    }
    if (initialized[index] === 0) {
      values[index] = options.sample(index)
      initialized[index] = 1
    }
    return values[index]
  }
  return createCoordinateArray({length: options.length, read})
}

interface DeferredPoint {
  readonly x: number
  readonly y: number
}

interface CreateDeferredPointsOptions {
  /** Nonnegative integer number of x/y pairs in this immutable runtime frame. */
  readonly pointCount: number
  /** Resolves both coordinates for one zero-based point index on its first read. */
  readonly sample: (pointIndex: number) => DeferredPoint
}

/** Interleaved coordinates that resolve and retain an x/y pair together on its first read. */
export const createDeferredPointCoordinates = (
  options: CreateDeferredPointsOptions,
): ReadonlyArray<number> => {
  validateLength(options.pointCount)
  const length = options.pointCount * 2
  validateLength(length)
  const values = new Float64Array(length)
  const initialized = new Uint8Array(options.pointCount)
  const read = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= length) {
      return undefined
    }
    const pointIndex = Math.floor(index / 2)
    if (initialized[pointIndex] === 0) {
      const point = options.sample(pointIndex)
      values[pointIndex * 2] = point.x
      values[pointIndex * 2 + 1] = point.y
      initialized[pointIndex] = 1
    }
    return values[index]
  }
  return createCoordinateArray({length, read})
}
