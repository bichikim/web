import {vi, it, describe, expect} from 'vitest'
import {createFocusController} from './focus-controller'

describe('focus-controller', () => {
  it('should create a focus controller', () => {
    const focusController = createFocusController()

    expect(focusController).toBeDefined()
  })

  it('should register deep position', () => {
    //
  })
  it('should unregister deep position', () => {})
  it('should update deep position', () => {})
  it('should emit focused event', () => {})
  it('should move deep position', () => {})
})
