import {describe, expect, test, vi} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetKeyframe,
  type PuppetMotion,
} from '../../document'
import {sampleKeyframes} from '../../internal/motion'
import {parseDocumentValue} from '../../parse-document'
import {createMotionPlaybacks} from '../create-motion-playbacks'
import {createSelectedPlayback} from '../create-selected-playback'
import {mixMotionFrames} from '../mix-motion-frames'
import {easeSine} from '../motion-fade'

const segment = (easing: PuppetKeyframe['easing'], bezier?: PuppetKeyframe['bezier']) => [
  {bezier, easing, time: 0, value: 0},
  {time: 2, value: 10},
]

const track = (keyframes: ReadonlyArray<PuppetKeyframe>) => ({
  keyframes,
  kind: 'parameter' as const,
  parameterId: 'p',
})

const document = (motions: ReadonlyArray<PuppetMotion>): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions,
  parameters: [{defaultValue: 0, id: 'p', maximum: 10, minimum: -10, name: 'P'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('motion curves', () => {
  test('should hold stepped values and jump to inverse-stepped ones', () => {
    expect(sampleKeyframes(segment('stepped'), 1.99)).toBe(0)
    expect(sampleKeyframes(segment('stepped'), 2)).toBe(10)
    expect(sampleKeyframes(segment('inverse-stepped'), 0)).toBe(0)
    expect(sampleKeyframes(segment('inverse-stepped'), 0.01)).toBe(10)
  })

  test('should follow Bezier handles in time and value', () => {
    // Default handles: a symmetric S curve through the midpoint, flat at both ends.
    expect(sampleKeyframes(segment('bezier'), 1)).toBeCloseTo(5, 9)
    expect(sampleKeyframes(segment('bezier'), 0.1)).toBeLessThan(0.5)
    // Handles at the thirds of a straight line reproduce linear interpolation.
    const linear = segment('bezier', [1 / 3, 10 / 3, 2 / 3, 20 / 3])
    expect(sampleKeyframes(linear, 0.5)).toBeCloseTo(2.5, 9)
    // Overshooting handles leave the value range between the keyframes.
    expect(sampleKeyframes(segment('bezier', [0.2, 20, 0.8, 20]), 1)).toBeGreaterThan(10)
  })
})

describe('motion fades', () => {
  const fading: PuppetMotion = {
    duration: 2,
    fadeInTime: 1,
    fadeOutTime: 0.5,
    id: 'fading',
    tracks: [track([{time: 0, value: 8}])],
  }

  test('should ease a track in after starting and out before ending', () => {
    const value = (elapsed?: number, remaining?: number) =>
      mixMotionFrames({
        document: document([fading]),
        frames: [
          {blend: 'replace', elapsed, motion: fading, priority: 0, remaining, time: 0, weight: 1},
        ],
      }).parameterValues.p

    expect(value()).toBe(8)
    expect(value(0.5)).toBeCloseTo(8 * easeSine(0.5))
    expect(value(1, 0.125)).toBeCloseTo(8 * easeSine(0.25))
    expect(value(0)).toBe(0)
  })

  test('should prefer a track fade time over the motion fade time', () => {
    const keyed = {...fading, tracks: [{...track([{time: 0, value: 8}]), fadeInTime: 0}]}
    const {p} = mixMotionFrames({
      document: document([keyed]),
      frames: [{blend: 'replace', elapsed: 0, motion: keyed, priority: 0, time: 0, weight: 1}],
    }).parameterValues
    expect(p).toBe(8)
  })

  test('should cross-fade a switched selection and report events in order', () => {
    const onEvent = vi.fn()
    const first: PuppetMotion = {
      duration: 1,
      events: [
        {time: 0.9, value: 'late'},
        {time: 0.2, value: 'early'},
      ],
      fadeOutTime: 0.4,
      id: 'first',
      tracks: [track([{time: 0, value: 4}])],
    }
    const second: PuppetMotion = {
      duration: 1,
      events: [{time: 0.1, value: 'second'}],
      fadeInTime: 0.4,
      id: 'second',
      tracks: [track([{time: 0, value: -4}])],
    }
    const playback = createSelectedPlayback({motions: [first, second], onEvent})
    playback.advance(0.95)?.()
    playback.advance(0.3)?.()
    expect(onEvent.mock.calls.map(([event]) => event.value)).toEqual(['early', 'late', 'early'])

    expect(playback.playMotion('second')).toBe(true)
    playback.advance(0.2)?.()
    const frames = playback.frames()
    expect(frames.map((frame) => [frame.motion.id, frame.elapsed, frame.remaining])).toEqual([
      ['first', undefined, expect.closeTo(0.2)],
      ['second', expect.closeTo(0.2), undefined],
    ])
    // Equal fade times sum to full weight: halfway between both motions.
    expect(
      mixMotionFrames({document: document([first, second]), frames}).parameterValues.p,
    ).toBeCloseTo(0)
    expect(onEvent).toHaveBeenLastCalledWith({motionId: 'second', time: 0.1, value: 'second'})

    playback.advance(0.3)
    expect(playback.frames().map((frame) => frame.motion.id)).toEqual(['second'])
  })

  test('should fade a switched-away motion from where its own fade stood', () => {
    const constant = (id: string, value: number): PuppetMotion => ({
      duration: 2,
      fadeInTime: 0.5,
      fadeOutTime: 0.5,
      id,
      loop: false,
      tracks: [track([{time: 0, value}])],
    })
    const motions = [constant('a', 8), constant('b', -8), constant('c', 4)]
    const mix = (playback: ReturnType<typeof createSelectedPlayback>) =>
      mixMotionFrames({document: document(motions), frames: playback.frames()}).parameterValues.p!

    // Near its end a one-shot has almost faded out; switching must not bring it back.
    const ending = createSelectedPlayback({motions})
    ending.advance(1.95)
    const before = mix(ending)
    ending.playMotion('b')
    expect(mix(ending)).toBeCloseTo(before, 6)
    expect(ending.frames()[0]!.remaining).toBeCloseTo(0.05)

    // A second switch keeps the first outgoing motion fading instead of dropping it.
    const twice = createSelectedPlayback({motions})
    twice.advance(0.5)
    twice.playMotion('b')
    twice.advance(0.05)
    const fading = mix(twice)
    twice.playMotion('c')
    expect(twice.frames().map((frame) => frame.motion.id)).toEqual(['a', 'b', 'c'])
    expect(mix(twice)).toBeCloseTo(fading, 6)
  })

  test('should fade a one-shot out at its end after a seek while playing', () => {
    const once: PuppetMotion = {...fading, fadeOutTime: 0.5, loop: false}
    const playback = createSelectedPlayback({motions: [once]})
    playback.seek(0.1)
    playback.advance(1.85)
    const near = mixMotionFrames({document: document([once]), frames: playback.frames()})
    expect(Math.abs(near.parameterValues.p!)).toBeLessThan(8)
    playback.advance(0.1)
    expect(
      mixMotionFrames({document: document([once]), frames: playback.frames()}).parameterValues.p,
    ).toBeCloseTo(0)
  })

  test('should hold fading motions while paused and fade frozen ones over real time', () => {
    const second: PuppetMotion = {...fading, id: 'second'}
    const paused = createSelectedPlayback({motions: [fading, second]})
    paused.advance(1)
    paused.playMotion('second')
    paused.pause()
    paused.advance(0.2)
    const [outgoing] = paused.frames()
    expect([outgoing!.motion.id, outgoing!.rate, outgoing!.remaining]).toEqual(['fading', 0, 0.5])
    expect(paused.isPlaying()).toBe(false)

    const frozen = createSelectedPlayback({motions: [fading, second]})
    frozen.advance(1)
    frozen.setSpeed(0)
    frozen.playMotion('second')
    frozen.advance(0.25)
    const [held] = frozen.frames()
    expect([held!.motion.id, held!.time, held!.remaining]).toEqual(['fading', 1, 0.25])
    frozen.advance(0.25)
    expect(frozen.frames().map((frame) => frame.motion.id)).toEqual(['second'])
  })

  test('should hold fading motions on pause after a one-shot selection finished', () => {
    const short: PuppetMotion = {duration: 0.2, id: 'short', loop: false, tracks: []}
    const playback = createSelectedPlayback({motions: [fading, short]})
    playback.advance(0.1)
    playback.playMotion('short')
    playback.advance(0.3)
    playback.pause()
    const before = playback.frames()[0]!
    playback.advance(0.2)
    const after = playback.frames()[0]!
    expect([after.motion.id, after.rate, after.time]).toEqual(['fading', 0, before.time])
    expect(playback.isPlaying()).toBe(false)
  })

  test('should show a scrubbed one-shot at full weight until playback resumes', () => {
    const once: PuppetMotion = {...fading, fadeOutTime: 0.5, loop: false}
    const playback = createSelectedPlayback({motions: [once]})
    playback.pause()
    playback.seek(1.9)
    const at = () => mixMotionFrames({document: document([once]), frames: playback.frames()})
    expect(at().parameterValues.p).toBeCloseTo(sampleKeyframes(once.tracks[0]!.keyframes, 1.9), 9)
    playback.resume()
    expect(Math.abs(at().parameterValues.p!)).toBeLessThan(
      Math.abs(sampleKeyframes(once.tracks[0]!.keyframes, 1.9)),
    )
  })

  test('should default looping to the motion and fade a layered playback out on request', () => {
    const once: PuppetMotion = {...fading, loop: false}
    const playbacks = createMotionPlaybacks({motions: [once], onChange: () => undefined})
    const playback = playbacks.start('fading')!
    playbacks.advance(1.8)
    expect(playbacks.frames()[0]?.remaining).toBeCloseTo(0.2)

    playback.seek(0)
    playback.fadeOut()
    playbacks.advance(0.3)
    expect(playbacks.frames()[0]?.remaining).toBeCloseTo(0.2)
    playbacks.advance(0.3)
    expect(playbacks.frames()).toEqual([])
    expect(playback.getState().status).toBe('stopped')
  })
})

describe('motion validation', () => {
  const valid = (motion: Record<string, unknown>) =>
    parseDocumentValue(
      document([
        {duration: 1, id: 'm', tracks: [track([{time: 0, value: 0}])], ...motion} as PuppetMotion,
      ]),
    ).ok

  test('should accept motion metadata, fades, events and Bezier handles', () => {
    expect(
      valid({
        events: [{time: 1, value: 'end'}],
        fadeInTime: 0.5,
        loop: false,
        name: '인사',
        tracks: [
          {...track([{bezier: [0, 1, 1, 0], easing: 'bezier', time: 0, value: 0}]), fadeOutTime: 0},
        ],
      }),
    ).toBe(true)
  })

  test('should reject events past the end, negative fades and misplaced handles', () => {
    expect(valid({events: [{time: 2, value: 'late'}]})).toBe(false)
    expect(valid({fadeOutTime: -1})).toBe(false)
    expect(valid({tracks: [track([{bezier: [0, 1, 1, 0], time: 0, value: 0}])]})).toBe(false)
    expect(
      valid({tracks: [track([{bezier: [1.5, 1, 1, 0], easing: 'bezier', time: 0, value: 0}])]}),
    ).toBe(false)
    expect(valid({name: ''})).toBe(false)
  })
})
