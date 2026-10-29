import type {PuppetDocument} from '../../document'
import {expandDocumentTextureAssets} from '../../texture-assets'
import {encodeFile} from '../encode-file'

self.addEventListener('message', async (event: MessageEvent<unknown>) => {
  try {
    self.postMessage({
      blob: await encodeFile(expandDocumentTextureAssets(event.data) as PuppetDocument),
      ok: true,
    })
  } catch (error) {
    self.postMessage({error: error instanceof Error ? error.message : String(error), ok: false})
  }
})
