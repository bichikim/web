import {setFunctionMocks} from '../'

describe('setFunctionMocks', () => {
  it('should mock all', () => {
    const mocker: any = jest.fn((value) => value)

    expect(
      setFunctionMocks(
        {
          bar: null,
          foo: () => null,
        },
        mocker,
      ),
    ).toEqual({
      bar: null,
      foo: expect.any(Function),
    })
  })
})
