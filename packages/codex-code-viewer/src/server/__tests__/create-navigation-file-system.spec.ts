import typescript from '@typescript/typescript6'
import {describe, expect, it, vi} from 'vitest'
import {createNavigationFileSystem} from '../create-navigation-file-system'

describe('createNavigationFileSystem', () => {
  it('should reuse positive and negative filesystem probes until cleared', () => {
    const fileExists = vi.fn((path: string) => path === '/present')
    const directoryExists = vi.fn((path: string) => path === '/directory')
    const cache = createNavigationFileSystem({...typescript.sys, directoryExists, fileExists})
    for (const path of ['/present', '/missing']) {
      expect(cache.host.fileExists(path)).toBe(path === '/present')
      expect(cache.host.fileExists(path)).toBe(path === '/present')
    }
    expect(fileExists).toHaveBeenCalledTimes(2)
    expect(cache.host.directoryExists('/directory')).toBe(true)
    expect(cache.host.directoryExists('/directory')).toBe(true)
    expect(directoryExists).toHaveBeenCalledOnce()
    cache.clear()
    expect(cache.host.fileExists('/present')).toBe(true)
    expect(fileExists).toHaveBeenCalledTimes(3)
  })
  it('should retain missing reads and distinguish encodings without hiding changes after clearing', () => {
    const readFile = vi.fn<typescript.System['readFile']>().mockReturnValue(undefined)
    const cache = createNavigationFileSystem({...typescript.sys, readFile})
    expect(cache.host.readFile('/config')).toBeUndefined()
    expect(cache.host.readFile('/config')).toBeUndefined()
    expect(readFile).toHaveBeenCalledOnce()
    readFile.mockReturnValue('new configuration')
    expect(cache.host.readFile('/config', 'utf8')).toBe('new configuration')
    expect(cache.host.readFile('/config')).toBeUndefined()
    cache.clear()
    expect(cache.host.readFile('/config')).toBe('new configuration')
    expect(readFile).toHaveBeenCalledTimes(3)
  })
  it('should reuse directory and canonical path reads without exposing cached arrays', () => {
    const getDirectories = vi.fn(() => ['child'])
    const realpath = vi.fn((path: string) => `/canonical${path}`)
    const cache = createNavigationFileSystem({...typescript.sys, getDirectories, realpath})
    cache.host.getDirectories('/root').push('changed')
    expect(cache.host.getDirectories('/root')).toEqual(['child'])
    expect(getDirectories).toHaveBeenCalledOnce()
    expect(cache.host.realpath?.('/root')).toBe('/canonical/root')
    expect(cache.host.realpath?.('/root')).toBe('/canonical/root')
    expect(realpath).toHaveBeenCalledOnce()
    cache.clear()
    expect(cache.host.getDirectories('/root')).toEqual(['child'])
    expect(cache.host.realpath?.('/root')).toBe('/canonical/root')
    expect(getDirectories).toHaveBeenCalledTimes(2)
    expect(realpath).toHaveBeenCalledTimes(2)
  })
})
