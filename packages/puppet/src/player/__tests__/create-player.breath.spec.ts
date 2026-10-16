/** @vitest-environment jsdom */

import {afterEach, expect, test, vi} from 'vitest'

import {createPlayer} from '../create-player'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

const mocks = vi.hoisted(() => ({
  Application: vi.fn(),
  Container: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Application: mocks.Application,
  Container: mocks.Container,
  UPDATE_PRIORITY: {LOW: -50},
}))

afterEach(() => {
  vi.clearAllMocks()
})

const setUpRenderer = () => {
  const application = {
    destroy: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    screen: {height: 10, width: 10},
    stage: {addChild: vi.fn()},
    start: vi.fn(),
    stop: vi.fn(),
    ticker: {add: vi.fn()},
  }
  const root = {addChild: vi.fn(), position: {set: vi.fn()}, scale: {set: vi.fn()}}
  for (const [mock, value] of [
    [mocks.Application, application],
    [mocks.Container, root],
  ] as const) {
    mock.mockImplementation(
      class {
        constructor() {
          Object.assign(this, value)
        }
      } as unknown as () => unknown,
    )
  }
  return (seconds: number) => {
    for (const [callback] of application.ticker.add.mock.calls) {
      ;(callback as (ticker: {deltaMS: number}) => void)({deltaMS: seconds * 1000})
    }
  }
}

const document: PuppetDocument = {
  breath: [{offset: 0, parameterId: 'angle', peak: 10, period: 4, weight: 1}],
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
    {defaultValue: 0, id: 'hair', maximum: 30, minimum: -30, name: 'Hair'},
  ],
  parts: [],
  physics: {
    pendulums: [
      {
        damping: 2,
        gravity: 9.8,
        id: 'hair',
        inputParameterId: 'angle',
        inputScale: 1,
        length: 1,
        outputMode: 'lag',
        outputParameterId: 'hair',
        outputScale: 1,
      },
    ],
  },
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 10, width: 10},
}

const prepare = (value: PuppetDocument) => {
  const result = parseDocument(serializeDocument(value))
  if (!result.ok) {
    throw new Error('Expected the test document to be valid')
  }
  return result.document
}

test('should breathe before physics while enabled', async () => {
  const tick = setUpRenderer()
  const player = await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: prepare(document),
  })
  tick(1)
  expect(player.getParameterValue('angle')).toBe(0)
  player.setBreath(true)
  tick(1)
  // A quarter period after starting: the sine's peak.
  expect(player.getParameterValue('angle')).toBeCloseTo(10, 9)
  // The pendulum follows the breathing input, so its lag output moved.
  expect(player.getParameterValue('hair')).not.toBe(0)
  player.setBreath(false)
  tick(0)
  expect(player.getParameterValue('angle')).toBe(0)
  player.destroy()
})

test('should look toward the target and back to the center', async () => {
  const tick = setUpRenderer()
  const player = await createPlayer({
    canvas: globalThis.document.createElement('canvas'),
    document: prepare({
      ...document,
      breath: undefined,
      look: [{parameterId: 'angle', x: 30, xy: 0, y: 0}],
    }),
  })
  player.setLookTarget({x: 0.5, y: 0})
  tick(0.05)
  const moving = player.getParameterValue('angle')!
  expect(moving).toBeGreaterThan(0)
  expect(moving).toBeLessThan(15)
  tick(1)
  expect(player.getParameterValue('angle')).toBe(15)
  player.setLookTarget()
  tick(1)
  expect(player.getParameterValue('angle')).toBe(0)
  player.destroy()
})
