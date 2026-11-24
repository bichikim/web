import {afterEach, expect, test} from 'vitest'
import {
  createDemoDocument,
  createPlayer,
  flushPlayerInputs,
  getPlayerBufferingInfo,
  parseDocument,
  type Player,
  type PlayerBufferingInfo,
  serializeDocument,
} from '../../src/player'
const players: Player[] = []
afterEach(() => {
  players.splice(0).forEach((player) => player.destroy())
  document.body.replaceChildren()
})
const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === null || adapter === undefined)
gpuTest(
  'should restart shared geometry across renderer replacement without losing pending controls',
  async () => {
    const parsed = parseDocument(serializeDocument(createDemoDocument()))
    if (!parsed.ok) {
      throw new Error('Invalid fixture')
    }
    const host = document.createElement('div')
    Object.defineProperties(host, {clientHeight: {value: 200}, clientWidth: {value: 200}})
    document.body.append(host)
    const canvas = () => {
      const next = document.createElement('canvas')
      host.append(next)
      return next
    }
    const observers = new Set<(info: PlayerBufferingInfo) => void>()
    let first = () => {}
    const displayed = new Promise<void>((resolve) => {
      first = resolve
    })
    const player = await createPlayer({
      buffering: true,
      canvas: canvas(),
      document: parsed.document,
      onBufferingChange: (info) => observers.forEach((listener) => listener(info)),
      onFrame: first,
      renderer: 'wgpu',
      resizeTo: host,
      workerRuntime: 'rust',
    })
    players.push(player)
    await displayed
    player.setPhysicsPreview(false)
    player.setEyeBlink(false)
    player.setBreath(false)
    player.pause()
    await flushPlayerInputs(player)
    const parameter = parsed.document.parameters?.[0]
    if (parameter === undefined) {
      throw new Error('Missing fixture parameter')
    }
    const value = parameter.minimum + (parameter.maximum - parameter.minimum) * 0.37
    player.patchParameterValues({[parameter.id]: value})
    await flushPlayerInputs(player)
    const replacement = () =>
      new Promise<void>((resolve) => {
        let preparing = false
        const listen = (info: PlayerBufferingInfo) => {
          if (info.status === 'preparing') {
            preparing = true
          }
          if (preparing && info.status === 'idle') {
            observers.delete(listen)
            resolve()
          }
        }
        observers.add(listen)
      })
    const cpu = replacement()
    expect(await player.configureRenderer({canvas: canvas(), renderer: 'pixi-webgl'})).toBe(
      'applied',
    )
    await cpu
    expect(getPlayerBufferingInfo(player)).toMatchObject({status: 'idle', workerRuntime: 'rust'})
    expect(player.getParameterValues()[parameter.id]).toBe(value)
    const gpu = replacement()
    expect(await player.configureRenderer({canvas: canvas(), renderer: 'wgpu'})).toBe('applied')
    await gpu
    expect(player.getRenderingInfo().runtime).toBe('wgpu')
    expect(getPlayerBufferingInfo(player)).toMatchObject({status: 'idle', workerRuntime: 'rust'})
    expect(player.getParameterValues()[parameter.id]).toBe(value)
    await expect(flushPlayerInputs(player)).resolves.toBe('applied')
  },
  30000,
)
