/** @vitest-environment jsdom */
import {afterEach, expect, it} from 'vitest'
import {retainInputFocus} from '../retain-input-focus'

afterEach(() => document.body.replaceChildren())

it('should restore input focus after an asynchronous operation temporarily removes it', async () => {
  const input = document.createElement('input')
  document.body.append(input)
  input.focus()
  const completed = Promise.withResolvers<void>()
  const operation = async () => {
    input.blur()
    input.disabled = true
    await completed.promise
    input.disabled = false
  }
  const pending = retainInputFocus({element: input, operation})
  expect(document.activeElement).toBe(document.body)
  completed.resolve()
  await pending
  expect(document.activeElement).toBe(input)
})

it('should preserve focus moved by the user while an operation is pending', async () => {
  const input = document.createElement('input')
  const other = document.createElement('button')
  document.body.append(input, other)
  input.focus()
  const completed = Promise.withResolvers<void>()
  const pending = retainInputFocus({element: input, operation: () => completed.promise})
  other.focus()
  completed.resolve()
  await pending
  expect(document.activeElement).toBe(other)
})

it('should skip a removed input and propagate operation failures', async () => {
  const input = document.createElement('input')
  document.body.append(input)
  input.focus()
  const failure = new Error('write failed')
  const operation = async () => {
    input.remove()
    throw failure
  }
  await expect(retainInputFocus({element: input, operation})).rejects.toBe(failure)
  expect(document.activeElement).toBe(document.body)
})
