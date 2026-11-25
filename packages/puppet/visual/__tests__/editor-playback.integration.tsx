import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {page} from 'vitest/browser'
import {createElementModel} from '../../src/editor-element/create-element-model'
import {PuppetEditor} from '../../src/editor/PuppetEditor'
import {createDemoDocument} from '../../src/player'

afterEach(cleanup)

test('should advance the editor timeline after replacing the renderer during playback', async () => {
  const document = createDemoDocument()
  const model = createElementModel({document, sessionId: 'host'})
  const view = render(() => <PuppetEditor initialWorkspace="animation" model={model} />)
  const play = page.getByRole('button', {exact: true, name: '재생'})
  const stop = page.getByRole('button', {exact: true, name: '정지'})
  const timeline = view.getByRole('slider', {name: '재생 위치'})
  const time = () => Number(timeline.getAttribute('aria-valuenow'))

  await expect.element(play).toBeEnabled()
  await play.click()
  await expect.poll(time).toBeGreaterThan(0)
  const originalCanvas = view.getByLabelText('모델 뷰어')
  const extraPart = {...document.parts[0]!, id: 'host-added-part'}
  model.request({
    document: {...document, parts: [...document.parts, extraPart], scene: undefined},
    expectedRevision: 0,
    ownerId: 'host',
    requestId: 'add-part',
    type: 'edit',
  })

  expect(model.read().undoCount).toBe(1)
  await expect.element(stop).toBeEnabled()
  expect(view.getByLabelText('모델 뷰어')).not.toBe(originalCanvas)
  const firstTime = time()
  await expect.poll(time).not.toBe(firstTime)
})
