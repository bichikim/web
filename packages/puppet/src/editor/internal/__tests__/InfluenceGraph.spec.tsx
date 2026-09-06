/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {InfluenceGraph} from '../InfluenceGraph'

test('should show the sampled input and follow input updates without normalizing the weight axis', () => {
  const [value, setValue] = createSignal(5)
  render(() => (
    <InfluenceGraph
      parameter={{id: 'control', minimum: -10, defaultValue: 0, name: 'Control', maximum: 10}}
      relation={{
        parameterId: 'control',
        points: [
          {value: -10, weight: 0},
          {value: 0, weight: 0.8},
          {value: 10, weight: 0},
        ],
      }}
      value={value()}
    />
  ))
  expect(screen.getByText('현재 입력 5 → 적용량 40%')).toBeVisible()
  const graph = screen.getByRole('img', {name: 'Control 영향도 곡선'})
  expect(graph.querySelector('circle')).toHaveAttribute('cx', '150')
  expect(graph.querySelector('circle')).toHaveAttribute('cy', '60')
  setValue(100)
  expect(screen.getByText('현재 입력 10 → 적용량 0%')).toBeVisible()
  setValue(Number.NaN)
  expect(screen.getByText('현재 입력 0 → 적용량 80%')).toBeVisible()
})
test('should extend a custom curve to the full input range with constant endpoints', () => {
  render(() => (
    <InfluenceGraph
      parameter={{id: 'control', minimum: -10, defaultValue: 0, name: 'Control', maximum: 10}}
      relation={{parameterId: 'control', points: [{value: 0, weight: 0.25}]}}
    />
  ))
  expect(screen.getByText('현재 입력 0 → 적용량 25%')).toBeVisible()
  expect(screen.getByRole('img').querySelector('polyline')).toHaveAttribute(
    'points',
    '0,75 100,75 200,75',
  )
})
