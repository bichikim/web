import type {ParameterGroup} from '../../tracking/types'
export const PARAMETER_ROW_HEIGHT = 40
const BROADCAST_HEADER = 64
const FOLDER_HEADER = 40
export const getGroupHeader = (group: ParameterGroup) =>
  group.mode === 'broadcast' ? BROADCAST_HEADER : FOLDER_HEADER
