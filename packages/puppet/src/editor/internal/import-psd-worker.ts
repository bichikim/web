import {initializeCanvas} from 'ag-psd'
import {readPsdDocument} from './read-psd-document'

// ag-psd types its canvas adapter as HTMLCanvasElement, but reads only its 2D canvas API.
initializeCanvas(
  (width, height) => new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement,
  (width, height) => new ImageData(width, height),
)

self.addEventListener('message', async (event: MessageEvent<File>) => {
  self.postMessage(await readPsdDocument(event.data))
})
