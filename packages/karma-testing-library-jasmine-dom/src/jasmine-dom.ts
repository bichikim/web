import {toHaveStyle} from './to-have-style'

if (window.jasmine) {
  console.log('having jasmine')
  // eslint-disable-next-line prefer-destructuring
  const jasmine: any = window.jasmine
  beforeAll(() => {
    // todo toHaveStyle is not working
    jasmine.getEnv().addMatchers({toHaveStyle})
  })
}
