const shell = require('shelljs')
console.log('hello')
shell.cd('./')
shell.exec('docker-compose up --no-start')
