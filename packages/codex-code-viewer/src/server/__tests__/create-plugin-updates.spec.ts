/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createPluginUpdates} from '../create-plugin-updates'

const version = '0.6.1'
const port = {
  install: vi.fn<() => Promise<void>>(),
  readLatest: vi.fn<() => Promise<string>>(),
}
beforeEach(() => {
  vi.resetAllMocks()
  port.install.mockResolvedValue(undefined)
  port.readLatest.mockResolvedValue('99.0.0')
})
describe('createPluginUpdates', () => {
  it('should check npm without installing and report a newer version', async () => {
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    expect(await updates.check()).toEqual({
      current: version,
      latest: '99.0.0',
      status: 'available',
      target: 'codex',
    })
    expect(port.readLatest).toHaveBeenCalledOnce()
    expect(port.install).not.toHaveBeenCalled()
  })
  it.each([version, '0.0.1'])(
    'should avoid downgrading from the running version to %s',
    async (latest) => {
      port.readLatest.mockResolvedValue(latest)
      expect(
        await createPluginUpdates({current: version, port, target: 'codex'}).check(),
      ).toMatchObject({status: 'current'})
    },
  )
  it('should install only a checked exact version for the current host and preserve restart state', async () => {
    const updates = createPluginUpdates({current: version, port, target: 'claude'})
    await updates.check()
    port.readLatest.mockResolvedValue('100.0.0')
    expect(await updates.install('99.0.0')).toMatchObject({
      latest: '99.0.0',
      status: 'installed',
      target: 'claude',
    })
    expect(port.install).toHaveBeenCalledWith('99.0.0')
    expect(await updates.check()).toMatchObject({latest: '99.0.0', status: 'installed'})
  })
  it('should reject installation before checking or with an unverified version', async () => {
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    await expect(updates.install('99.0.0')).rejects.toThrow()
    await updates.check()
    await expect(updates.install('100.0.0')).rejects.toThrow()
    expect(port.install).not.toHaveBeenCalled()
  })
  it('should share concurrent installation and avoid reinstalling before restart', async () => {
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    await updates.check()
    await Promise.all([updates.install('99.0.0'), updates.install('99.0.0')])
    await updates.install('99.0.0')
    expect(port.install).toHaveBeenCalledOnce()
  })
  it('should allow retrying an unsuccessful installation', async () => {
    vi.mocked(port.install).mockRejectedValueOnce(new Error('npx missing'))
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    await updates.check()
    await expect(updates.install('99.0.0')).rejects.toThrow('npx missing')
    expect(await updates.install('99.0.0')).toMatchObject({status: 'installed'})
  })
  it('should preserve installation completion when an earlier registry request finishes later', async () => {
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    await updates.check()
    const response = Promise.withResolvers<string>()
    port.readLatest.mockReturnValueOnce(response.promise)
    const checking = updates.check()
    await updates.install('99.0.0')
    response.resolve('100.0.0')
    expect(await checking).toMatchObject({latest: '99.0.0', status: 'installed'})
  })
  it('should share concurrent registry requests instead of allowing response order to select a version', async () => {
    const response = Promise.withResolvers<string>()
    port.readLatest.mockReturnValue(response.promise)
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    const first = updates.check()
    const second = updates.check()
    response.resolve('99.0.0')
    expect(await first).toEqual(await second)
    expect(port.readLatest).toHaveBeenCalledOnce()
  })
  it('should propagate a failed lookup and allow another check', async () => {
    port.readLatest.mockRejectedValueOnce(new Error('offline'))
    const updates = createPluginUpdates({current: version, port, target: 'codex'})
    await expect(updates.check()).rejects.toThrow('offline')
    expect(await updates.check()).toMatchObject({latest: '99.0.0', status: 'available'})
  })
})
