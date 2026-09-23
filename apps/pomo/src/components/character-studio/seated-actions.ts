const TIMING = {
  cycle: 48,
  gesture: {end: 18, start: 12},
  glance: {end: 10, start: 5},
  hands: {end: 28, start: 22},
  shift: {end: 39, start: 33},
}

const envelope = (time: number, range: {readonly start: number; readonly end: number}) => {
  const {start, end} = range
  if (time <= start || time >= end) {
    return 0
  }
  return Math.sin(((time - start) / (end - start)) * Math.PI) ** 2
}

export const sampleSeatedAction = (seconds: number) => {
  const time = seconds % TIMING.cycle
  return {
    gesture: envelope(time, TIMING.gesture),
    glance: envelope(time, TIMING.glance),
    hands: envelope(time, TIMING.hands),
    shift: envelope(time, TIMING.shift),
  }
}
