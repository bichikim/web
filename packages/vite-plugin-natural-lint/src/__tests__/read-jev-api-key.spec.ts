import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {readJevApiKey} from '../read-jev-api-key'

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'natural-lint-jev-key-'))
})

afterEach(async () => {
  await rm(root, {force: true, recursive: true})
})

it('should prefer a trimmed environment key over the project key', async () => {
  await writeFile(path.join(root, '.env.local'), 'TYPESAFE_API_KEY=file-key\n')

  await expect(readJevApiKey(root, ' env-key ')).resolves.toBe('env-key')
})

it('should read a project key when the environment key is blank', async () => {
  await writeFile(path.join(root, '.env.local'), 'TYPESAFE_API_KEY= file-key \n')

  await expect(readJevApiKey(root, '  ')).resolves.toBe('file-key')
})

it('should require a key when the project file is absent', async () => {
  await expect(readJevApiKey(root, undefined)).rejects.toThrow('TYPESAFE_API_KEY')
})
