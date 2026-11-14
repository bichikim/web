/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
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
  expect(fixture.resumeTime()).toBe(2.5)
  fixture.select('tap')
  expect(fixture.resumeTime()).toBeUndefined()
  fixture.select('idle')
  fixture.replace({...original})
  expect(fixture.resumeTime()).toBeUndefined()
  fixture.resetFrame()
  expect(fixture.frame()).toBeNull()
  fixture.dispose()
})
