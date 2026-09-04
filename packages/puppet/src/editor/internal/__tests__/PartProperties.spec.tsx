/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import type {PuppetPart} from '../../../player'
import {PartProperties} from '../PartProperties'

const part: PuppetPart = {
  id: 'part',
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
  texture: {height: 1, src: 'part.png', width: 1},
}

test('should disable only visual rendering inputs when visual editing is disabled', () => {
  render(() => (
    <PartProperties
      maskPartOptions={[]}
      part={part}
      staticDisabled={false}
      visualDisabled={true}
      onInterpolatedChange={vi.fn()}
      onStaticChange={vi.fn()}
    />
  ))

  expect(screen.getByLabelText('파트 불투명도')).toBeDisabled()
  expect(screen.getByLabelText('파트 곱하기 색상')).toBeDisabled()
  expect(screen.getByLabelText('파트 스크린 색상')).toBeDisabled()
  expect(screen.getByLabelText('파트 블렌드 모드')).toBeEnabled()
})
