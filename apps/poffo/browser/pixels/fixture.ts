import {renderDocument} from '../../src/backend/browser/render-document'

Reflect.set(globalThis, 'poffoPixelRender', async () => {
  const response = await fetch('/examples/development-model.json')
  if (!response.ok) {
    throw new Error(`Character fixture failed: ${response.status}`)
  }
  return renderDocument({document: await response.json(), size: 1280})
})
