import {expect, it, vi} from 'vitest'
import * as previewModule from './create-preview'
import {withViewer} from './with-viewer'

it('should retain the exercise error and real diagnostics even if preview cleanup also fails', async () => {
  const original = new Error('exercise assertion failed')
  const previewFailure = new Error('preview close failed')
  const createPreview = previewModule.createPreview
  vi.spyOn(previewModule, 'createPreview').mockImplementation(async (options) => {
    const preview = await createPreview(options)
    return {
      ...preview,
      close: async () => {
        await preview.close()
        throw previewFailure
      },
    }
  })
  try {
    const error = await withViewer({}, async (viewer) => {
      const initial = viewer.page.waitForResponse(`${viewer.url}initial`)
      await viewer.page.goto(viewer.url)
      await initial
      const post = viewer.page.request.post.bind(viewer.page.request)
      // Corrupt only fixture cleanup to verify diagnostics, not the original CI failure.
      vi.spyOn(viewer.page.request, 'post').mockImplementation((url, options) =>
        post(url, {...options, data: '{'}),
      )
      throw original
    }).catch((failure: unknown) => failure)
    expect(error).toBeInstanceOf(AggregateError)
    if (!(error instanceof AggregateError)) {
      throw new Error('Expected retained failures')
    }
    expect(error.errors[0]).toMatchObject({cause: original})
    expect(error.errors[1]).toMatchObject({
      message: expect.stringContaining('Preview code.close: 500'),
    })
    expect(error.errors[2]).toBe(previewFailure)
    expect(error.message).toContain('Preview stderr:')
    expect(error.message).toContain('SyntaxError:')
  } finally {
    vi.restoreAllMocks()
  }
})
