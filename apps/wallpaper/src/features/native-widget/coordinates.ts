/** Applies indexed ranges as raw Float32 words, including signed zero and NaN payloads. */
export const createCoordinateReceiver = () => {
  let previous: Uint32Array | undefined
  return {
    apply(delta: Uint32Array, destination: ArrayBuffer) {
      const output = new Uint32Array(destination)
      const initial = previous?.length !== output.length
      if (
        initial &&
        output.length > 0 &&
        (delta.length !== output.length + 2 || delta[0] !== 0 || delta[1] !== output.length)
      ) {
        throw new Error('Missing initial native coordinates')
      }
      const coordinates = initial ? new Uint32Array(output.length) : previous!
      let index = 0
      while (index < delta.length) {
        const start = delta[index]
        const count = delta[index + 1]
        index += 2
        if (
          start === undefined ||
          count === undefined ||
          index + count > delta.length ||
          start + count > coordinates.length
        ) {
          throw new Error('Incomplete native coordinate range')
        }
        coordinates.set(delta.subarray(index, index + count), start)
        index += count
      }
      previous = coordinates
      output.set(coordinates)
    },
    clear() {
      previous = undefined
    },
  }
}
