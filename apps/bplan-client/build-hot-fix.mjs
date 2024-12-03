/* eslint-disable no-tabs,max-len */
import nodePath from 'node:path'
import nodeFs from 'node:fs'

const fix = async () => {
  const src = './.output/server/chunks/nitro/nitro.mjs'
  const scriptJs = await nodeFs.promises.readFile(src, 'utf-8')
  await nodeFs.promises.writeFile(src, scriptJs.replace(`
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}`, `
// hot fixed
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && (Object.keys(n).length === 1 || (Object.prototype.hasOwnProperty.call(n, '__esModule') && Object.keys(n).length === 2) ) ? n['default'] : n;
}`), 'utf-8')
}

fix()