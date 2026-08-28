/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {createPlayer} from '../create-player'

const mocks = vi.hoisted(() => ({
  Application: vi.fn(),
  Container: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: mocks.Application,
  Container: mocks.Container,
  MeshSimple: vi.fn(),
  Texture: {from: vi.fn()},
}))

const puppetDocument: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 100, width: 200},
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('createPlayer', () => {
  test('should control a player without textured parts', async () => {
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      screen: {height: 100, width: 200},
      stage: {addChild: vi.fn()},
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {add: vi.fn()},
    }
    const root = {
      addChild: vi.fn(),
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
    }

    mocks.Application.mockImplementation(
      class {
        constructor() {
          Object.assign(this, application)
        }
      } as unknown as () => unknown,
    )
    mocks.Container.mockImplementation(
      class {
        constructor() {
          Object.assign(this, root)
        }
      } as unknown as () => unknown,
    )

    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: puppetDocument,
    })

    player.pause()
    player.play()
    player.seek(1)

    expect(application.init).toHaveBeenCalledOnce()
    expect(application.stop).toHaveBeenCalledOnce()
    expect(application.start).toHaveBeenCalledOnce()
    expect(application.render).toHaveBeenCalledOnce()
    expect(player.updateDocument(puppetDocument)).toBe(true)
    expect(
      player.updateDocument({
        ...puppetDocument,
        parts: [
          {
            id: 'new-part',
            mesh: {boundaryLoops: [], indices: [], uvs: [], vertices: []},
            texture: {height: 1, src: 'new.png', width: 1},
          },
        ],
      }),
    ).toBe(false)

    player.destroy()
    player.destroy()
    expect(application.destroy).toHaveBeenCalledOnce()
  })
})
