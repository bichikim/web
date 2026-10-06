import {expect, it} from 'vitest'
import {resolveTextModelAssetUrl} from '..'

it('should resolve model revisions and relative assets against each source host', () => {
  expect(
    resolveTextModelAssetUrl({
      assetSource: {
        host: 'https://huggingface.co/',
        pathTemplate: '{model}/resolve/{revision}/',
        revision: 'v2',
      },
      relativePath: 'onnx/model.onnx',
      repositoryId: 'org/model',
    }),
  ).toBe('https://huggingface.co/org/model/resolve/v2/onnx/model.onnx')
  expect(
    resolveTextModelAssetUrl({
      assetSource: {
        host: 'https://cdn.example/assets/',
        pathTemplate: 'models/{model}/{revision}/',
        revision: 'r1',
      },
      relativePath: 'tokenizer.json',
      repositoryId: 'gemma',
    }),
  ).toBe('https://cdn.example/assets/models/gemma/r1/tokenizer.json')
})
