import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {getInstallFiles} from '../get-install-files'

describe('getInstallFiles', () => {
  it('returns install files with leading slash', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sw-install-'))
    const assetsRoot = path.join(tmpDir, 'assets')
    await fs.promises.mkdir(path.join(assetsRoot, 'nested'), {recursive: true})
    await fs.promises.writeFile(path.join(assetsRoot, 'file.txt'), '')
    await fs.promises.writeFile(path.join(assetsRoot, 'nested', 'file.js'), '')

    try {
      const result = await getInstallFiles({cwd: tmpDir, root: 'assets', files: '**/*'})
      expect(result.sort()).toEqual(['/file.txt', '/nested/file.js'])
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})
