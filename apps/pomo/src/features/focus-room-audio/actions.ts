import {action} from '@solidjs/router'

import {requestTrackAccess, type TrackAccess} from './track-preview-access'

export type TrackAccessActionResult =
  | {readonly access: TrackAccess; readonly status: 'granted'}
  | {readonly status: 'authentication-required'}
  | {readonly status: 'unavailable'}

const runRequestTrackAccess = async (trackId: string): Promise<TrackAccessActionResult> => {
  try {
    const access = await requestTrackAccess(trackId)
    return access === null ? {status: 'authentication-required'} : {access, status: 'granted'}
  } catch {
    return {status: 'unavailable'}
  }
}

export const requestTrackAccessAction = action(
  runRequestTrackAccess,
  'request-focus-room-track-access',
)
