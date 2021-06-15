import * as devtool from '@vue/devtools-api'
import {startDevtool} from 'src/devtool'
import {state} from 'src/state'
import {createApp} from 'vue-demi'

jest.mock('@vue/devtools-api', () => ({
  setupDevtoolsPlugin: jest.fn(),
}))

const setup = () => {
  const mockApi = {
    addInspector: jest.fn(),
    addTimelineLayer: jest.fn(),
    getInspectorTree: jest.fn(),
    getInspectorState: jest.fn(),
    editInspectorState: jest.fn(),
    sendInspectorTree: jest.fn(),
    sendInspectorState: jest.fn(),
  }

  const foo = state({
    name: 'foo',
  })

  const _devtool: any = devtool

  _devtool.setupDevtoolsPlugin = jest.fn((options, setup) => {
    setup(mockApi)
  })

  const app = createApp({})

  const myDevtool = startDevtool(app, {foo})

  return {
    myDevtool,
  }
}

describe('devtool', () => {
  it('should run', () => {
    const {myDevtool} = setup()
    // WIP
    expect(typeof myDevtool).toBe('object')
  })
})
