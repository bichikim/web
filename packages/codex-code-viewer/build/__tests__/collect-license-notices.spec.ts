import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {collectLicenseNotices} from '../collect-license-notices'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'code-viewer-licenses-'))
})
afterEach(async () => {
  await rm(root, {force: true, recursive: true})
})

const createPackage = async (name: string, version: string) => {
  const directory = `${root}/node_modules/${name}`
  await mkdir(directory, {recursive: true})
  await writeFile(`${directory}/package.json`, JSON.stringify({name, version}))
  return directory
}

describe('collectLicenseNotices', () => {
  it('should include scoped package notices once and ignore application modules', async () => {
    const directory = await createPackage('@example/library', '1.0.0')
    await writeFile(`${directory}/LICENSE`, 'License text')
    await writeFile(`${directory}/NOTICE`, 'Notice text')
    const result = await collectLicenseNotices(root, [
      'src/main.ts',
      'node_modules/@example/library/index.js',
      'node_modules/@example/library/helper.js',
    ])
    expect(result.match(/## @example\/library@1.0.0/gu)).toHaveLength(1)
    expect(result).toContain('License text')
    expect(result).toContain('Notice text')
  })

  it('should include a supplied license only for its exact package version', async () => {
    await createPackage('library', '1.0.0')
    expect(
      await collectLicenseNotices(root, ['node_modules/library/index.js'], {
        'library@1.0.0': 'Official license text',
      }),
    ).toContain('Official license text')
  })

  it('should fail packaging when a license is missing instead of omitting its notice', async () => {
    await createPackage('library', '2.0.0')
    await expect(
      collectLicenseNotices(root, ['node_modules/library/index.js'], {
        'library@1.0.0': 'Outdated license',
      }),
    ).rejects.toThrow('Missing license text for library@2.0.0')
  })
})
