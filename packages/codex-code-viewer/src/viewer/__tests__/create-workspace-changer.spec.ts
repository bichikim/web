import {expect, it, vi} from 'vitest'
import {createWorkspaceChanger} from '../create-workspace-changer'

it('should preserve the current folder when unsaved changes prevent leaving', async () => {
  const changeWorkspace = vi.fn()
  const receive = vi.fn()
  const change = createWorkspaceChanger({
    beforeChange: async () => false,
    port: {changeWorkspace},
    receive,
  })
  expect(await change?.('/new')).toBe(false)
  expect(changeWorkspace).not.toHaveBeenCalled()
  expect(receive).not.toHaveBeenCalled()
})
it('should persist and display the new folder after leaving is accepted', async () => {
  const connection = {session: 'new', workspace: '/new'}
  const changeWorkspace = vi.fn().mockResolvedValue(connection)
  const receive = vi.fn()
  const change = createWorkspaceChanger({
    beforeChange: async () => true,
    port: {changeWorkspace},
    receive,
  })
  expect(await change?.('/new')).toBe(true)
  expect(changeWorkspace).toHaveBeenCalledExactlyOnceWith('/new')
  expect(receive).toHaveBeenCalledExactlyOnceWith(connection)
})
it('should preserve the displayed folder when persistence fails', async () => {
  const receive = vi.fn()
  const change = createWorkspaceChanger({
    beforeChange: async () => true,
    port: {changeWorkspace: vi.fn().mockRejectedValue(new Error('write failed'))},
    receive,
  })
  await expect(change?.('/new')).rejects.toThrow('write failed')
  expect(receive).not.toHaveBeenCalled()
})
it('should omit workspace changes for a host without support', () => {
  expect(
    createWorkspaceChanger({beforeChange: vi.fn(), port: {}, receive: vi.fn()}),
  ).toBeUndefined()
})
