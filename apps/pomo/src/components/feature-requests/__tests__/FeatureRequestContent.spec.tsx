/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../../features/auth/controller'
import type {FeatureRequestsController} from '../../../features/feature-requests'
import {FeatureRequestContent} from '../FeatureRequestContent'
import {FeatureRequestForm} from '../FeatureRequestForm'
import {FeatureRequestList} from '../FeatureRequestList'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useFeatureRequests: vi.fn(),
}))

vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: mocks.useAuth}))
vi.mock('../../../features/feature-requests', () => ({
  useFeatureRequests: mocks.useFeatureRequests,
}))
vi.mock('../FeatureRequestForm', () => ({
  FeatureRequestForm: vi.fn(() => <button type="button">새 기능 요청</button>),
}))
vi.mock('../FeatureRequestList', () => ({
  FeatureRequestList: vi.fn((props: {readonly newRequestAction: JSX.Element}) => (
    <section>
      {props.newRequestAction}
      <span>기능 요청 목록</span>
    </section>
  )),
}))

const authentication = {} as AuthController
const model = {} as FeatureRequestsController

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useAuth.mockReturnValue(authentication)
  mocks.useFeatureRequests.mockReturnValue(model)
})

it('should compose authentication, request state, list, and new request action', () => {
  render(() => <FeatureRequestContent />)

  expect(screen.getByRole('button', {name: '새 기능 요청'})).toBeInTheDocument()
  expect(vi.mocked(FeatureRequestList)).toHaveBeenCalledWith(
    expect.objectContaining({authentication, model, newRequestAction: expect.anything()}),
  )
  expect(vi.mocked(FeatureRequestForm)).toHaveBeenCalledWith(
    expect.objectContaining({authentication, model}),
  )
})
