/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'
import {prepareDocument, puppetDocument} from './fixtures/document'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'

import {createPlayer} from '../create-player'
import {parseDocument} from '../parse-document'
import type {PreparedPuppetDocument} from '../prepare-puppet-document'
import {serializeDocument} from '../serialize-document'
import {markPreparedPuppetDocument} from '../internal/prepared-document'

const mocks = vi.hoisted(() => ({
  AlphaMask: vi.fn(),
  Application: vi.fn(),
  ColorMatrixFilter: vi.fn(),
  Container: vi.fn(),
  MeshSimple: vi.fn(),
  TextureFrom: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  AlphaMask: mocks.AlphaMask,
  Application: mocks.Application,
  ColorMatrixFilter: mocks.ColorMatrixFilter,
  Container: mocks.Container,
  MeshSimple: mocks.MeshSimple,
  Texture: {from: mocks.TextureFrom},
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('createPlayer', () => {
  test('should reject a document that has not crossed the validation boundary', () => {
    const unpreparedDocument = puppetDocument as PreparedPuppetDocument

    return expect(
      createPlayer({canvas: document.createElement('canvas'), document: unpreparedDocument}),
    ).rejects.toThrow('Puppet document must be prepared before it is passed to the player')
  })

  test('should control a player without textured parts', async () => {
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      resize: vi.fn(),
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

    const preparedDocument = prepareDocument(puppetDocument)
    const replacementDocument = prepareDocument({
      ...puppetDocument,
      parts: [
        {
          id: 'new-part',
          mesh: {
            boundaryLoops: [[0, 1, 2]],
            indices: [0, 1, 2],
            uvs: [0, 0, 1, 0, 0, 1],
            vertices: [0, 0, 1, 0, 0, 1],
          },
          texture: {height: 1, src: 'new.png', width: 1},
        },
      ],
    })
    const player = await createPlayer({
      canvas: document.createElement('canvas'),
      document: preparedDocument,
    })

    player.pause()
    player.play()
    player.seek(1)
    player.resize()

    expect(application.init).toHaveBeenCalledOnce()
    expect(application.stop).toHaveBeenCalledOnce()
    expect(application.start).toHaveBeenCalledOnce()
    expect(application.resize).toHaveBeenCalledOnce()
    expect(application.render).toHaveBeenCalledTimes(3)
    expect(player.updateDocument(preparedDocument)).toBe(true)
    expect(player.updateDocument(replacementDocument)).toBe(false)
    expect(() => player.updateDocument(puppetDocument as PreparedPuppetDocument)).toThrow(
      'Puppet document must be prepared before it is passed to the player',
    )

    player.destroy()
    player.destroy()
    expect(application.destroy).toHaveBeenCalledOnce()
  })

  test('should switch motions and finish a one-shot playback', async () => {
    let tick: ((ticker: {readonly deltaMS: number}) => void) | undefined
    const application = {
      destroy: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      screen: {height: 100, width: 200},
      stage: {addChild: vi.fn()},
      start: vi.fn(),
      stop: vi.fn(),
      ticker: {
        add: vi.fn((handler: (ticker: {readonly deltaMS: number}) => void) => {
          tick = handler
        }),
      },
    }
    const root = {
      addChild: vi.fn(),
      position: {set: vi.fn()},
      scale: {set: vi.fn()},
    }
    const onFrame = vi.fn()
    const source = prepareDocument({
      ...puppetDocument,
      motions: [
        {duration: 2, id: 'idle', tracks: []},
        {duration: 0.5, id: 'blink', tracks: []},
      ],
    })

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
      document: source,
      onFrame,
    })
    const onComplete = vi.fn()

    expect(player.setMotion('blink')).toBe(true)
    expect(onFrame).toHaveBeenLastCalledWith({duration: 0.5, motionId: 'blink', time: 0})
    expect(player.playMotion('blink', {loop: false, onComplete})).toBe(true)
    tick?.({deltaMS: 600})

    expect(onFrame).toHaveBeenLastCalledWith({duration: 0.5, motionId: 'blink', time: 0.5})
    expect(application.stop).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledOnce()
    expect(player.setMotion('missing')).toBe(false)

    player.destroy()
  })
})
