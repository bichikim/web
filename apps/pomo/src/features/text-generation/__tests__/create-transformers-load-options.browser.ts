// oxlint-disable eslint-js/camelcase -- Transformers.js options follow its external contract.
import {expect, it} from 'vitest'

it('should derive loader options in a browser Worker without mutating inputs or reporting progress', async () => {
  const moduleUrl = new URL('../create-transformers-load-options.ts', import.meta.url).href
  const workerUrl = URL.createObjectURL(
    new Blob(
      [
        `import {createTransformersLoadOptions} from ${JSON.stringify(moduleUrl)};
    onmessage = ({data: models}) => {
      const onProgress = () => {throw new Error('Unexpected progress callback')};
      const results = models.map((model) => {
        Object.freeze(model.assetSource);
        Object.freeze(model);
        const options = createTransformersLoadOptions({model, onProgress});
        return {
          device: options.device,
          dtype: options.dtype,
          progressMatches: options.progress_callback === onProgress,
          revision: options.revision,
        };
      });
      postMessage(results);
    };`,
      ],
      {type: 'text/javascript'},
    ),
  )
  let worker: Worker | undefined
  try {
    worker = new Worker(workerUrl, {type: 'module'})
    const completed = Promise.withResolvers<unknown>()
    worker.addEventListener('message', (event) => completed.resolve(event.data), {once: true})
    worker.addEventListener('error', (event) => completed.reject(new Error(event.message)), {
      once: true,
    })
    worker.postMessage([
      {architecture: 'lfm-2', assetSource: {revision: 'lfm-pinned'}, quantization: 'q4'},
      {architecture: 'gemma-4', assetSource: {revision: 'gemma-pinned'}, quantization: 'q2f16'},
      {architecture: 'qwen-3.5', assetSource: {revision: 'qwen-pinned'}, quantization: 'q4'},
    ])
    expect(await completed.promise).toEqual([
      {device: 'webgpu', dtype: 'q4', progressMatches: true, revision: 'lfm-pinned'},
      {
        device: 'webgpu',
        dtype: {decoder_model_merged: 'q2f16', embed_tokens: 'q2f16'},
        progressMatches: true,
        revision: 'gemma-pinned',
      },
      {
        device: 'webgpu',
        dtype: {decoder_model_merged: 'q4', embed_tokens: 'q4'},
        progressMatches: true,
        revision: 'qwen-pinned',
      },
    ])
  } finally {
    worker?.terminate()
    URL.revokeObjectURL(workerUrl)
  }
})
