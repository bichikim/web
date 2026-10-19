/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import type {PoffoTrackingOptions} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoMotionAdjustment} from '../SPoffoMotionAdjustment'

afterEach(cleanup)

test('should preserve existing multipliers and keep the base direction independent from movement limits', () => {
  const [value, setValue] = createSignal<PoffoTrackingOptions>({
    cameraX: -0.2,
    eyeCenterY: 10,
    headCenterX: 50,
    headLimitX: 2,
    headScale: 1.5,
    headVerticalScale: 3.5,
  })
  render(() => <SPoffoMotionAdjustment target="head" value={value()} onChange={setValue} />)
  expect(screen.getByRole('spinbutton', {name: '얼굴 상하 반응 배율'})).toHaveValue('5.25')
  fireEvent.click(screen.getByRole('button', {name: '얼굴 좌우 반응 배율 늘리기'}))
  expect(value()).toMatchObject({
    eyeCenterY: 10,
    headResponseX: 1.6,
    headScale: 1.5,
    headVerticalScale: 3.5,
  })
  expect(screen.getByRole('spinbutton', {name: '얼굴 상하 반응 배율'})).toHaveValue('5.25')
  const vertical = screen.getByRole('spinbutton', {name: '얼굴 상하 반응 배율'})
  fireEvent.input(vertical, {target: {value: '3'}})
  fireEvent.blur(vertical)
  expect(value()).toMatchObject({headResponseX: 1.6, headResponseY: 3})
  const limit = screen.getByRole('spinbutton', {name: '얼굴 좌우 최대'})
  fireEvent.input(limit, {target: {value: '0'}})
  fireEvent.blur(limit)
  expect(value()).toMatchObject({headCenterX: 50, headMaximumX: 0, headMinimumX: -2})
  fireEvent.click(screen.getByRole('button', {name: '얼굴 초기화'}))
  expect(value()).toEqual({
    cameraX: -0.2,
    eyeCenterY: 10,
    headCenterX: 0,
    headCenterY: 0,
    headLimitX: 30,
    headLimitY: 30,
    headMaximumX: 30,
    headMaximumY: 30,
    headMinimumX: -30,
    headMinimumY: -30,
    headResponseX: 1,
    headResponseY: 2.5,
    headScale: 1,
    headVerticalScale: 2.5,
  })
})
