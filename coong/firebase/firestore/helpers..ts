import {readFileSync} from 'fs'
import {initializeTestEnvironment} from '@firebase/rules-unit-testing'
import {setDoc} from 'firebase/firestore'

export const setup = async (auth: string, data) => {
  // const projectId = `rules-spec-${Date.now()}`
  // const app = await initializeTestApp({
  //   auth,
  //   projectId,
  // })
  //
  // const db = app.firestore()
  //
  // // Apply the test rules so we can write documents without needing the admin app
  // await loadFirestoreRules({
  //   projectId,
  //   rules: readFileSync('firestore/firestore-test.rules', 'utf8'),
  // })

  // Write mock documents before rules
  // if (data) {
  //   const list: any[] = Object.keys(data).map((key) => {
  //     const ref = db.doc(key)
  //     const value = data[key]
  //     return ref.set(value)
  //   })
  //   await Promise.all(list)
  // }

  // Apply rules
  const testEnv = await initializeTestEnvironment({
    firestore: {
      rules: readFileSync('../firestore.rules', 'utf8'),
    },
    projectId: 'baco-5663c',
  })

  const user = testEnv.authenticatedContext(auth)

  const db = user.firestore()

  return {
    db,
    testEnv,
  }
}

