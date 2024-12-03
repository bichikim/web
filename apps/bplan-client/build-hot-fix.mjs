/* eslint-disable no-tabs,max-len,prettier/prettier,unicorn/prevent-abbreviations */
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import {fileURLToPath, URL} from 'node:url'

const fix = async () => {
  const src = nodePath.resolve('.output/server/chunks/nitro/nitro.mjs')
  const scriptJs = await nodeFs.promises.readFile(src, 'utf8')
  await nodeFs.promises.writeFile(src, scriptJs.replace(`
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}`, `
// hot fixed
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && (Object.keys(n).length === 1 || (Object.prototype.hasOwnProperty.call(n, '__esModule') && Object.keys(n).length === 2) ) ? n['default'] : n;
}`), 'utf8')
}

fix()
