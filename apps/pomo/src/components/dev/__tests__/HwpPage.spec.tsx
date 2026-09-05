/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import HwpPage from '../HwpPage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../hwp/Workspace', () => ({
  HwpWorkspace: () => <output>hwp workspace</output>,
}))

afterEach(() => {
  cleanup()
})

it('should render the HWP development page with its editor and project link', () => {
  render(() => <HwpPage />)

  expect(screen.getByText('한글 문서 실험실')).toBeDefined()
  expect(screen.getByText('hwp workspace')).toBeDefined()
  expect(screen.getByRole('link', {name: /rhwp 프로젝트/u}).getAttribute('href')).toBe(
    'https://github.com/edwardkim/rhwp',
  )
})
