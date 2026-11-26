/** @vitest-environment jsdom */
import {createRoot, createSignal, flush} from 'solid-js'
import {expect, test} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {usePlaybackFrame} from '../use-playback-frame'

test('should resume only the recorded document and selected motion and clear imported frames', () => {
  const original = createDemoDocument()
  const fixture = createRoot((dispose) => {
    const [document, replace] = createSignal(original)
    const [motion, select] = createSignal('idle')
    return {...usePlaybackFrame(document, motion), dispose, replace, select}
  })
  expect(fixture.resumeTime()).toBeUndefined()
  fixture.updateFrame({duration: 9, motionId: 'idle', time: 2.5})
  flush()
  expect(fixture.resumeTime()).toBe(2.5)
  fixture.select('tap')
  flush()
  expect(fixture.resumeTime()).toBeUndefined()
  fixture.select('idle')
  flush()
  fixture.replace({...original})
  flush()
  expect(fixture.resumeTime()).toBeUndefined()
  fixture.resetFrame()
  flush()
  expect(fixture.frame()).toBeNull()
  fixture.dispose()
})
