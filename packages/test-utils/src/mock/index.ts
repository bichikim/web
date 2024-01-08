import {Mock} from 'src/types'
import {fn} from 'jest-mock'

/**
 * type wrapper 실제 jest.mock 을 랩핑 하지 않습니다
 * @deprecated please use jest.mocked instead
 * @param target
 * @param wrapMock
 */
export const mock = <T extends (...args: any[]) => any>(
  target: T,
  wrapMock: boolean = false,
): Mock<T> => (wrapMock ? fn(target) : target) as any
