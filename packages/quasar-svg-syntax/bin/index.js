#!/usr/bin/env node

const {generator, readArgv} = require('../lib/index.js')

generator(readArgv(process.argv)).then(() => {
  console.log('Done')
})
