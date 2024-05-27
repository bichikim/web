const path = require('node:path')
const fs = require('node:fs')
const solc = require('solc')

const inboxPath = path.resolve(__dirname, '..', 'src', 'Inbox.sol')
const source = fs.readFileSync(inboxPath, 'utf8')

module.exports = solc.compile(source, 1).contracts[':Inbox']
