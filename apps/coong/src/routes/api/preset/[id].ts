import {APIEvent} from '@solidjs/start/server'
import {getPresetData} from 'src/server/preset'

export async function GET(event: APIEvent) {
  const {id} = event.params

  return getPresetData(id)
}
