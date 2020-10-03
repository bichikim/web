// import * as fft from 'firebase-functions-tests'
import {helloWorld} from '../index'
import {expect} from 'chai'
import * as httpMocks from 'node-mocks-http'
import {EventEmitter} from 'events'

/**
 * 온라인 테스트가 필요할때
 * @see https://firebase.google.com/docs/functions/unit-testing#initializing
*/
// const functions = fft({
//   databaseURL: 'https://winter-lover.firebaseio.com',
//   projectId: 'winter-lover',
//   storageBucket: 'winter-lover.appspot.com',
// })

describe('helloWorld', function test() {
  it('should ', function test(done) {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/hellow-world',
    })
    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    })
    res.on('end', () => {
      expect('foo').to.equal('foo')
      const data = res._getData()
      expect(data).to.equal('Hello from Firebase!')
      done()
    })
    helloWorld(req, res)
  })
})
