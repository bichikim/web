import {mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {assertArtifactAbsent, readArtifact, writeArtifact} from '../artifacts'
let directory: string
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'knowledge-artifact-test-'))
})
afterEach(async () => {
  await rm(directory, {force: true, recursive: true})
})
it('should read YAML and publish complete JSON without overwriting an existing target', async () => {
  const path = join(directory, 'file.json')
  await assertArtifactAbsent(path)
  await writeArtifact({path, value: {version: 1}})
  expect(await readArtifact(path)).toEqual({version: 1})
  await expect(writeArtifact({path, value: {version: 2}})).rejects.toBeDefined()
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({version: 1})
  await expect(assertArtifactAbsent(path)).rejects.toBeDefined()
  await writeFile(join(directory, 'file.yml'), 'version: 1')
  expect(await readArtifact(join(directory, 'file.yml'))).toEqual({version: 1})
})
it('should preserve symlink read compatibility and reject replacing a dangling output symlink', async () => {
  const path = join(directory, 'source.yml')
  await writeFile(path, 'version: 1')
  const linked = join(directory, 'linked.yml')
  await symlink(path, linked)
  expect(await readArtifact(linked)).toEqual({version: 1})
  const dangling = join(directory, 'dangling.json')
  await symlink(join(directory, 'absent'), dangling)
  await expect(assertArtifactAbsent(dangling)).rejects.toBeDefined()
  await expect(writeArtifact({path: dangling, value: {version: 1}})).rejects.toBeDefined()
})
it('should publish only one complete output when writers race', async () => {
  const path = join(directory, 'race.json')
  const results = await Promise.allSettled([
    writeArtifact({path, value: {version: 1}}),
    writeArtifact({path, value: {version: 2}}),
  ])
  expect(results.filter(({status}) => status === 'fulfilled')).toHaveLength(1)
  expect([1, 2]).toContain(JSON.parse(await readFile(path, 'utf8')).version)
})
