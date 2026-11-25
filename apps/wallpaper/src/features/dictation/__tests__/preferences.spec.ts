import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import {createDictationPreferences} from '../preferences'

const names: string[] = []
afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})
const databaseName = () => {
  const name = `dictation-test-${crypto.randomUUID()}`
  names.push(name)
  return name
}

it('should retain global input settings after reopening the repository', async () => {
  const name = databaseName()
  const repository = createDictationPreferences(name)
  expect(await repository.read()).toEqual({model: 'buzzasr-korean-q8', vad: true})
  await repository.save({model: 'buzzasr-korean-q8', vad: false})
  repository.close()
  const reopened = createDictationPreferences(name)
  expect(await reopened.read()).toEqual({model: 'buzzasr-korean-q8', vad: false})
  reopened.close()
})

it('should merge concurrent changes from independent settings consumers', async () => {
  const name = databaseName()
  const first = createDictationPreferences(name)
  const second = createDictationPreferences(name)
  await Promise.all([first.save({model: 'buzzasr-korean-q8'}), second.save({vad: false})])
  expect(await first.read()).toEqual({model: 'buzzasr-korean-q8', vad: false})
  first.close()
  second.close()
})

it.each([
  {model: 'qwen3-asr-1.7b', vad: true},
  {model: 'qwen3-asr-0.6b', vad: false},
])('should migrate stored $model to BuzzASR while retaining Silero $vad', async (stored) => {
  const name = databaseName()
  const previous = new Dexie(name)
  previous.version(1).stores({preferences: ''})
  await previous.table('preferences').put(stored, 'input')
  previous.close()
  const repository = createDictationPreferences(name)
  const expected = {model: 'buzzasr-korean-q8', vad: stored.vad}
  expect(await repository.read()).toEqual(expected)
  repository.close()
  const database = await new Dexie(name).open()
  expect(await database.table('preferences').get('input')).toEqual(expected)
  database.close()
})
