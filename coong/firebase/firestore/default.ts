import {setup, teardown} from './helpers'
import {assertFails} from '@firebase/rules-unit-testing'

describe('Default firestore rules', () => {
  let db
  let ref

  beforeAll(async () => {
    db = await setup()
    ref = db.collection('non-existsent-collection')
  })

  afterAll(async () => {
    await teardown()
  })

  test('fail when trying to read from an unauthorised store', async () => {
    expect(await assertFails(ref.get()))
  })

  test('fail when trying to write to an unauthorised store', async () => {
    expect(await assertFails(ref.add({})))
  })
})
