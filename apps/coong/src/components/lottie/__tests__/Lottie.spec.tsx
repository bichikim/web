/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {LottieFile} from '../LottieFile'
import {LottieJson} from '../LottieJson'
import {Lottie} from '../Lottie'

vi.mock('../LottieFile', () => ({
  LottieFile: vi.fn(),
}))

vi.mock('../LottieJson', () => ({
  LottieJson: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(LottieFile).mockImplementation(() => <span>file lottie</span>)
  vi.mocked(LottieJson).mockImplementation(() => <span>json lottie</span>)
})

describe('Lottie', () => {
  it('should render JSON animation by default', () => {
    render(() => <Lottie src="animation.json" />)

    expect(screen.getByText('json lottie')).toBeInTheDocument()
    expect(LottieJson).toHaveBeenCalled()
  })

  it('should render file animation for the file type', () => {
    render(() => <Lottie type="file" src="animation.lottie" />)

    expect(screen.getByText('file lottie')).toBeInTheDocument()
    expect(LottieFile).toHaveBeenCalled()
  })
})
