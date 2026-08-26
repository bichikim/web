/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useKoreanTextSegments} from '../../../features/korean-text-postprocessor'
import {KoreanTextRenderer} from '../../KoreanTextRenderer'
import {ProcessedKoreanText} from '../ProcessedKoreanText'

vi.mock('../../../features/korean-text-postprocessor', () => ({useKoreanTextSegments: vi.fn()}))
vi.mock('../../KoreanTextRenderer', () => ({KoreanTextRenderer: vi.fn()}))

it('should process and render reactive Korean text segments', () => {
  vi.mocked(useKoreanTextSegments).mockImplementation((props) => () => [
    {kind: 'text', text: props.text()},
  ])
  vi.mocked(KoreanTextRenderer).mockImplementation((props) => (
    <span>{props.segments[0]?.text}</span>
  ))

  render(() => <ProcessedKoreanText text="안녕하세요" />)

  expect(screen.getByText('안녕하세요')).toBeInTheDocument()
})
