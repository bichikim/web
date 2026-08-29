/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {KoreanTextRenderer} from '../KoreanTextRenderer'
import {KoreanTextSegmentView} from '../korean-text-renderer/SegmentView'

vi.mock('../korean-text-renderer/SegmentView', () => ({KoreanTextSegmentView: vi.fn()}))

it('should render each Korean text segment', () => {
  vi.mocked(KoreanTextSegmentView).mockImplementation((props) => <span>{props.segment.text}</span>)

  render(() => (
    <KoreanTextRenderer
      segments={[
        {kind: 'text', text: '안녕'},
        {kind: 'refining', text: '하세요'},
      ]}
    />
  ))

  expect(screen.getByText('안녕')).toBeInTheDocument()
  expect(screen.getByText('하세요')).toBeInTheDocument()
})
