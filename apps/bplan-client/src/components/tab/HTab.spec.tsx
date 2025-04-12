import {afterEach, describe, expect, it} from 'vitest'
import {HTabButton} from './HTabButton'
import {HTabContent} from './HTabContent'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {HTabProvider} from './HTabProvider'

describe('HTabButton', () => {
  it('버튼이 올바르게 렌더링되어야 합니다', async () => {
    render(() => (
      <HTabProvider activeTab="tab1">
        <HTabButton value="tab1">탭 1</HTabButton>
        <HTabButton value="tab2">탭 2</HTabButton>
        <HTabContent name="tab1">탭 1 컨텐츠</HTabContent>
        <HTabContent name="tab2">탭 2 컨텐츠</HTabContent>
      </HTabProvider>
    ))

    const button1 = screen.getByText('탭 1')
    const button2 = screen.getByText('탭 2')
    const content1 = screen.getByText('탭 1 컨텐츠')

    expect(button1).toBeInTheDocument()
    expect(button2).toBeInTheDocument()
    expect(content1).toBeInTheDocument()
    expect(screen.queryByText('탭 2 컨텐츠')).not.toBeInTheDocument()
    expect(button1.dataset.state).toBe('active')
    expect(button2.dataset.state).toBe('inactive')
  })

  it('버튼 클릭 시 컨텐츠가 변경되어야 합니다', async () => {
    render(() => (
      <HTabProvider activeTab="tab1">
        <HTabButton value="tab1">탭 1</HTabButton>
        <HTabButton value="tab2">탭 2</HTabButton>
        <HTabContent name="tab1">탭 1 컨텐츠</HTabContent>
        <HTabContent name="tab2">탭 2 컨텐츠</HTabContent>
      </HTabProvider>
    ))

    const button1 = screen.getByText('탭 1')
    const button2 = screen.getByText('탭 2')

    expect(button1).toBeInTheDocument()
    expect(button2).toBeInTheDocument()
    expect(screen.queryByText('탭 1 컨텐츠')).toBeInTheDocument()
    expect(screen.queryByText('탭 2 컨텐츠')).not.toBeInTheDocument()
    expect(button1.dataset.state).toBe('active')
    expect(button2.dataset.state).toBe('inactive')
    // click button2
    await userEvent.click(button2)
    expect(button1.dataset.state).toBe('inactive')
    expect(button2.dataset.state).toBe('active')
    expect(screen.queryByText('탭 1 컨텐츠')).not.toBeInTheDocument()
    expect(screen.queryByText('탭 2 컨텐츠')).toBeInTheDocument()
    // click button1
    await userEvent.click(button1)
    expect(button1.dataset.state).toBe('active')
    expect(button2.dataset.state).toBe('inactive')
    expect(screen.queryByText('탭 1 컨텐츠')).toBeInTheDocument()
    expect(screen.queryByText('탭 2 컨텐츠')).not.toBeInTheDocument()
  })

  it('추가 속성이 버튼에 전달되어야 합니다', () => {
    render(() => (
      <HTabProvider activeTab="tab1">
        <HTabButton value="tab1" class="custom-class" data-testid="test-button">
          탭 1
        </HTabButton>
      </HTabProvider>
    ))

    const button = screen.getByTestId('test-button')

    expect(button).toHaveClass('custom-class')
  })
})
