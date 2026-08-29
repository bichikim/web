import {expect, it, vi} from 'vitest'

import {revokeLanguageLearningAudioUrls} from '../candidate'

it('should revoke every generated candidate audio URL', () => {
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

  revokeLanguageLearningAudioUrls([{audioUrl: 'blob:first'}, {audioUrl: 'blob:second'}])

  expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:first')
  expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:second')
})
