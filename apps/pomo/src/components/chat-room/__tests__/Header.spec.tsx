/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PSelect} from '../../PSelect'
import {ChatHeader} from '../Header'

vi.mock('../../PSelect', () => ({PSelect: vi.fn()}))

it('should render model information and forward model selection', () => {
  const onModelChange = vi.fn()
  vi.mocked(PSelect).mockImplementation((props) => {
    Object.values(props)
    return <div>{props.options.map((option) => option.label).join(', ')}</div>
  })

  render(() => <ChatHeader disabled modelId="qwen-4b" onModelChange={onModelChange} />)

  expect(screen.getByText('로컬 모델과 이어서 대화해요')).toBeInTheDocument()
  expect(PSelect).toHaveBeenCalledWith(
    expect.objectContaining({disabled: true, label: '채팅 모델', value: 'qwen-4b'}),
  )
  expect(PSelect).toHaveBeenCalledWith(expect.objectContaining({onChange: onModelChange}))
})
