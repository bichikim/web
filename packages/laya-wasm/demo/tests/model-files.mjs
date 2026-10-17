import assert from 'node:assert/strict'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {constants} from 'node:http2'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer, preview} from 'vite'

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url))
const directory = await mkdtemp(join(tmpdir(), 'laya-model-files-'))
const previous = process.env.LAYA_MODEL_DIR
const previousMultilingual = process.env.LAYA_MULTILINGUAL_MODEL_DIR
process.env.LAYA_MODEL_DIR = directory
process.env.LAYA_MULTILINGUAL_MODEL_DIR = directory
await writeFile(join(directory, 'manifest.json'), '{}')
const verify = async (mode) => {
  const server =
    mode === 'development'
      ? await createServer({configFile, server: {port: 0}})
      : await preview({configFile, preview: {port: 0}})
  try {
    if (mode === 'development') {
      await server.listen()
    }
    const address = server.httpServer.address()
    assert.ok(address !== null && typeof address === 'object')
    const base = `http://127.0.0.1:${address.port}`
    assert.equal((await fetch(`${base}/models/laya/%E0`)).status, constants.HTTP_STATUS_BAD_REQUEST)
    assert.equal(
      (await fetch(`${base}/models/laya/missing.onnx`)).status,
      constants.HTTP_STATUS_NOT_FOUND,
    )
    assert.equal(
      (await fetch(`${base}/models/laya/%2E%2E%2Foutside`)).status,
      constants.HTTP_STATUS_FORBIDDEN,
    )
    assert.equal(
      (await fetch(`${base}/models/laya/manifest.json`)).status,
      constants.HTTP_STATUS_OK,
    )
    assert.equal((await fetch(`${base}/`)).status, constants.HTTP_STATUS_OK)
    assert.equal(
      (await fetch(`${base}/models/laya-multilingual/manifest.json`)).status,
      constants.HTTP_STATUS_OK,
    )
    assert.equal(
      (await fetch(`${base}/models/laya-multilingual/%2E%2E%2Foutside`)).status,
      constants.HTTP_STATUS_FORBIDDEN,
    )
    console.log(
      `${mode}: malformed path 400, missing file 404, traversal 403; model and page still served`,
    )
  } finally {
    if (mode === 'development') {
      await server.close()
    } else {
      await new Promise((resolve) => {
        server.httpServer.close(resolve)
      })
    }
  }
}
try {
  await verify('development')
  await verify('preview')
} finally {
  if (previous === undefined) {
    delete process.env.LAYA_MODEL_DIR
  } else {
    process.env.LAYA_MODEL_DIR = previous
  }
  if (previousMultilingual === undefined) {
    delete process.env.LAYA_MULTILINGUAL_MODEL_DIR
  } else {
    process.env.LAYA_MULTILINGUAL_MODEL_DIR = previousMultilingual
  }
  await rm(directory, {force: true, recursive: true})
}
