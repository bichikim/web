const {generator, readArgv} = require('../dist/index.js')

generator(readArgv(process.argv)).then(() => {
  console.log('Done')
})
