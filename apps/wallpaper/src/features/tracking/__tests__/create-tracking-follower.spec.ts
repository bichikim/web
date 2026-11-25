import {afterEach, expect, it, vi} from 'vitest'
import {createTrackingFollower} from '../create-tracking-follower'

afterEach(() => vi.unstubAllGlobals())
it('should follow an observed body independently, including body-only updates and tracking loss', () => {
  let pending: FrameRequestCallback | null = null
  let timestamp = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    pending = null
  })
  const change = vi.fn()
  const follower = createTrackingFollower({body: true, bodySpeed: 1, onChange: change})
  const settle = () => {
    for (let index = 0; index < 180 && pending !== null; index += 1) {
      timestamp += 16
      const callback = pending
      pending = null
      callback(timestamp)
    }
    expect(pending).toBeNull()
  }
  follower.follow({x: 0.5, y: 0}, {x: 0.2, y: 0}, {x: -0.5, y: 0})
  settle()
  expect(change).toHaveBeenLastCalledWith({x: 0.5, y: 0}, {x: -0.5, y: 0}, {x: 0.2, y: 0})
  follower.follow({x: 0.5, y: 0}, {x: 0.2, y: 0}, {x: 1, y: 0})
  settle()
  expect(change.mock.lastCall?.[1]).toEqual({x: 1, y: 0})
  follower.follow({x: 0.5, y: 0}, {x: 0.2, y: 0}, {x: 0, y: 0})
  settle()
  expect(change.mock.lastCall?.[1]).toEqual({x: 0, y: 0})
  follower.dispose()
})

it('should settle eyes at their own cursor target even while the head target stays unchanged', () => {
  const pending = new Map<number, FrameRequestCallback>()
  let identifier = 0
  let timestamp = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    identifier += 1
    pending.set(identifier, callback)
    return identifier
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  const change = vi.fn()
  const follower = createTrackingFollower({onChange: change})
  const settle = () => {
    for (let index = 0; index < 150 && pending.size > 0; index += 1) {
      timestamp += 16
      const time = timestamp
      const callbacks = [...pending.values()]
      pending.clear()
      callbacks.forEach((callback) => callback(time))
    }
    expect(pending.size).toBe(0)
  }
  follower.follow({x: 0.5, y: 0}, {x: 1, y: 0})
  settle()
  expect(change).toHaveBeenLastCalledWith({x: 0.5, y: 0}, {x: 0.5, y: 0}, {x: 1, y: 0})
  follower.follow({x: 0.5, y: 0}, {x: 0.7, y: 0})
  settle()
  expect(change).toHaveBeenLastCalledWith({x: 0.5, y: 0}, {x: 0.5, y: 0}, {x: 0.7, y: 0})
  follower.dispose()
})
it('should independently pace head and eyes without making body follow the eyes', () => {
  const pending: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => pending.push(callback))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const normal = vi.fn()
  const slowHead = vi.fn()
  const fastEyes = vi.fn()
  const followers = [
    createTrackingFollower({body: true, onChange: normal}),
    createTrackingFollower({body: true, headSpeed: 0.25, onChange: slowHead}),
    createTrackingFollower({body: true, eyeSpeed: 4, onChange: fastEyes}),
  ]
  followers.forEach((follower) => follower.follow({x: 1, y: -1}))
  pending.splice(0).forEach((callback) => callback(16))
  expect(slowHead.mock.lastCall![0].x).toBeLessThan(normal.mock.lastCall![0].x)
  expect(slowHead.mock.lastCall![2]).toEqual(normal.mock.lastCall![2])
  expect(fastEyes.mock.lastCall![0]).toEqual(normal.mock.lastCall![0])
  expect(fastEyes.mock.lastCall![1]).toEqual(normal.mock.lastCall![1])
  expect(fastEyes.mock.lastCall![2].x).toBeGreaterThan(normal.mock.lastCall![2].x)
  expect(fastEyes.mock.lastCall![2].y).toBeLessThan(normal.mock.lastCall![2].y)
  followers.forEach((follower) => follower.dispose())
})
it('should change only body follow speed while keeping gaze response identical', () => {
  const pending: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => pending.push(callback))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const slow = vi.fn()
  const normal = vi.fn()
  const fast = vi.fn()
  const followers = [
    createTrackingFollower({body: true, bodySpeed: 0.25, onChange: slow}),
    createTrackingFollower({body: true, onChange: normal}),
    createTrackingFollower({body: true, bodySpeed: 4, onChange: fast}),
  ]
  followers.forEach((follower) => follower.follow({x: 1, y: 0}))
  pending.splice(0).forEach((callback) => callback(16))
  expect(slow.mock.lastCall![0]).toEqual(normal.mock.lastCall![0])
  expect(fast.mock.lastCall![0]).toEqual(normal.mock.lastCall![0])
  expect(slow.mock.lastCall![1].x).toBeLessThan(normal.mock.lastCall![1].x)
  expect(fast.mock.lastCall![1].x).toBeGreaterThan(normal.mock.lastCall![1].x)
  followers.forEach((follower) => follower.dispose())
})
it('should lag the horizontal body, settle after reversals and center return, and stop on disposal', () => {
  const pending = new Map<number, FrameRequestCallback>()
  let identifier = 0
  let timestamp = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    identifier += 1
    pending.set(identifier, callback)
    return identifier
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id))
  const tick = () => {
    timestamp += 16
    const callbacks = [...pending.values()]
    pending.clear()
    callbacks.forEach((callback) => callback(timestamp))
  }
  const settle = () => {
    for (let index = 0; index < 180 && pending.size > 0; index += 1) {
      tick()
    }
    expect(pending.size).toBe(0)
  }
  const change = vi.fn()
  const follower = createTrackingFollower({body: true, onChange: change})
  follower.follow({x: 1, y: 0.5})
  tick()
  const [gaze, body] = change.mock.lastCall!
  expect(body.x).toBeGreaterThan(0)
  expect(body.x).toBeLessThan(gaze.x)
  expect(body.y).toBe(gaze.y)
  settle()
  expect(change).toHaveBeenLastCalledWith({x: 1, y: 0.5}, {x: 1, y: 0.5}, {x: 1, y: 0.5})
  follower.follow({x: -1, y: 0})
  tick()
  expect(change.mock.lastCall![1].x).toBeGreaterThan(change.mock.lastCall![0].x)
  settle()
  expect(change).toHaveBeenLastCalledWith({x: -1, y: 0}, {x: -1, y: 0}, {x: -1, y: 0})
  follower.follow({x: 0, y: 0})
  settle()
  expect(change).toHaveBeenLastCalledWith({x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0})
  follower.follow({x: 1, y: 0})
  follower.dispose()
  follower.follow({x: -1, y: 0})
  expect(pending.size).toBe(0)
})

it('should smooth tilt together with the head and return to neutral when tracking is lost', () => {
  let pending: FrameRequestCallback | null = null
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    pending = null
  })
  const change = vi.fn()
  const follower = createTrackingFollower({onChange: change})
  const settle = () => {
    for (let index = 0; index < 180 && pending !== null; index += 1) {
      const callback = pending
      pending = null
      callback(index * 16)
    }
    expect(pending).toBeNull()
  }
  follower.follow({x: 0, y: 0, z: 1}, {x: -0.5, y: 0})
  settle()
  expect(change.mock.lastCall?.[0]).toEqual({x: 0, y: 0, z: 1})
  expect(change.mock.lastCall?.[2]).toEqual({x: -0.5, y: 0})
  follower.follow({x: 0, y: 0, z: 0})
  settle()
  expect(change.mock.lastCall?.[0].z).toBe(0)
  follower.dispose()
})
