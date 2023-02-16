import {useSound} from '@vueuse/sound'
import {mountScope, ref} from '@winter-love/vue-test'
// import {indexKeys} from 'src/hooks/piano/source'
import {usePiano} from '../'
import {useUntilTo} from 'src/hooks/until-to'

jest.mock('../source', () => {
  return {
    indexKeys: {},
  }
})
jest.mock('@vueuse/sound', () => {
  return {
    useSound: jest.fn(),
  }
})

jest.mock('src/hooks/until-to', () => {
  return {
    useUntilTo: jest.fn(),
  }
})

const _useSound = jest.mocked(useSound)
const _useUntilTo = jest.mocked(useUntilTo)

describe('useSound', () => {
  const setup = () => {
    _useSound.mockClear()
    _useUntilTo.mockClear()

    const untilTo = {
      run: jest.fn(),
      stop: jest.fn(),
      value: ref(100),
    }

    const sound: any = {
      play: jest.fn(),
      stop: jest.fn(),
    }

    _useUntilTo.mockReturnValueOnce(untilTo)
    _useSound.mockReturnValueOnce(sound)
    const piano = mountScope(() => usePiano('2c'))

    return {piano: piano.result, sound, stop: piano.stop, untilTo}
  }
  it('should play', () => {
    const {piano, untilTo, sound} = setup()
    expect(_useSound).toHaveBeenCalledTimes(1)
    expect(untilTo.stop).toHaveBeenCalledTimes(0)
    expect(sound.play).toHaveBeenCalledTimes(0)
    piano.down()
    expect(untilTo.stop).toHaveBeenCalledTimes(1)
    expect(sound.play).toHaveBeenCalledTimes(1)
  })
  it('should play', () => {
    const {piano, untilTo} = setup()
    expect(_useSound).toHaveBeenCalledTimes(1)
    expect(untilTo.stop).toHaveBeenCalledTimes(0)
    piano.down()
    expect(untilTo.stop).toHaveBeenCalledTimes(1)
  })
})
