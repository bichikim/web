import {SplendidGrandPiano} from 'smplr'
import {SampleStart} from 'src/components/midi-player/types'
import {SPlayerController, SPlayerControllerProps} from './SPlayerController'
import {createMemo, splitProps} from 'solid-js'

export interface SPlayerProps extends SPlayerControllerProps {
  piano?: SplendidGrandPiano
}

export const SPlayer = (props: SPlayerProps) => {
  const playStartedAtKey = Symbol('play-started-at')
  const targetIdKey = Symbol('play-started-at')
  const velocityPercent = 100
  let _currentTargetId = ''
  //
  const [innerProps, restProps] = splitProps(props, ['piano'])

  const handleMountSample = (payload: SampleStart, targetId: string) => {
    const _piano = innerProps.piano
    if (!_piano) {
      return
    }
    _currentTargetId = targetId
    // setLeftTime(0)
    _piano.start({
      ...payload,
      [playStartedAtKey]: _piano.context.currentTime,
      [targetIdKey]: targetId,
      time: (payload.time ?? 0) + _piano.context.currentTime,
      velocity: (payload.velocity ?? 1) * velocityPercent,
    } as any)
  }

  const handleStop = async () => {
    const _piano = innerProps.piano
    if (!_piano) {
      return
    }
    // await piano.context.suspend()
    _piano.stop()
  }

  const handleResume = () => {
    const _piano = innerProps.piano
    if (!_piano) {
      return
    }
    return _piano.context.resume()
  }

  const handleSuspend = () => {
    const _piano = innerProps.piano
    if (!_piano) {
      return
    }
    return _piano.context.suspend()
  }

  return <SPlayerController {...restProps} />
}
