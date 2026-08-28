import {render} from 'solid-js/web'
import {afterEach, describe, expect, test} from 'vitest'
import {page} from 'vitest/browser'

import {PlayerCanvas, type PlayerCanvasStatus} from '../../src/editor/PlayerCanvas'
import {addPartVertex, deletePartVertex, movePartVertex} from '../../src/editor/edit-document'
import {createDemoDocument, type PuppetDocument} from '../../src/player'

const PART_ID = 'mesh-preview'
const STAGE_STYLE = `
  html, body {
    margin: 0;
    background: #080b0a;
  }

  .visual-stage {
    width: 800px;
    height: 600px;
    overflow: hidden;
    background-color: #251c2b;
    background-image:
      linear-gradient(45deg, #49354f 25%, transparent 25%),
      linear-gradient(-45deg, #49354f 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #49354f 75%),
      linear-gradient(-45deg, transparent 75%, #49354f 75%);
    background-position: 0 0, 0 16px, 16px -16px, -16px 0;
    background-size: 32px 32px;
  }

  .visual-stage .player-canvas,
  .visual-stage .canvas-host,
  .visual-stage canvas {
    width: 100%;
    height: 100%;
  }

  .visual-stage canvas {
    display: block;
  }
`

let disposeView: (() => void) | undefined

const createPreviewDocument = () => {
  const document = createDemoDocument()
  return {...document, parts: document.parts.slice(0, 1)}
}

const waitForFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

const renderDocument = async (document: PuppetDocument) => {
  const root = window.document.createElement('div')
  window.document.body.replaceChildren(root)
  const ready = new Promise<void>((resolve, reject) => {
    const handleStatusChange = (status: PlayerCanvasStatus) => {
      if (status === 'ready') {
        resolve()
      } else if (status === 'error') {
        reject(new Error('PlayerCanvas failed to render the visual fixture'))
      }
    }

    disposeView = render(
      () => (
        <>
          <style>{STAGE_STYLE}</style>
          <section class="visual-stage" data-testid="visual-stage">
            <PlayerCanvas document={document} onStatusChange={handleStatusChange} />
          </section>
        </>
      ),
      root,
    )
  })

  await ready
  await waitForFrame()
  await waitForFrame()
  return page.getByTestId('visual-stage')
}

afterEach(() => {
  disposeView?.()
  disposeView = undefined
  window.document.body.replaceChildren()
})

describe('PlayerCanvas visual rendering', () => {
  test('should render the complete undeformed texture', async () => {
    const stage = await renderDocument(createPreviewDocument())

    await expect.element(stage).toMatchScreenshot('complete-texture')
  })

  test('should preserve the texture after promoting an added edge vertex', async () => {
    const added = addPartVertex({
      document: createPreviewDocument(),
      partId: PART_ID,
      x: 480,
      y: 0,
    })

    expect(added.ok).toBe(true)
    if (!added.ok) {
      return
    }

    const deleted = deletePartVertex({document: added.document, partId: PART_ID, vertexIndex: 0})

    expect(deleted.ok).toBe(true)
    if (!deleted.ok) {
      return
    }

    const stage = await renderDocument(deleted.document)
    await expect.element(stage).toMatchScreenshot('edge-vertex-promoted')
  })

  test('should stretch the texture beyond its original bounds', async () => {
    const moved = movePartVertex({
      document: createPreviewDocument(),
      partId: PART_ID,
      vertexIndex: 1,
      x: 760,
      y: -80,
    })

    expect(moved.ok).toBe(true)
    if (!moved.ok) {
      return
    }

    const stage = await renderDocument(moved.document)
    await expect.element(stage).toMatchScreenshot('texture-stretched-outside-bounds')
  })
})
