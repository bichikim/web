import {type Accessor, type Setter} from 'solid-js'

import {type PuppetDocument, type PuppetMotion} from '../../player/document'
import {editMotion} from './edit-motion'

type TimelineView = 'all' | 'single'

interface CreateTimelineMotionActionsOptions {
  readonly activeMotion: Accessor<PuppetMotion | undefined>
  readonly applyEdit: (result: ReturnType<typeof editMotion>, view: TimelineView) => void
  readonly document: Accessor<PuppetDocument>
  readonly motionTimes: Accessor<Readonly<Record<string, number>>>
  readonly setMotionTimes: Setter<Readonly<Record<string, number>>>
}

export const createTimelineMotionActions = (options: CreateTimelineMotionActionsOptions) => {
  const applyActiveMotionEdit = (edit: 'delete' | 'duplicate' | {readonly name: string}) => {
    const activeMotion = options.activeMotion()
    if (activeMotion === undefined) {
      return
    }

    options.applyEdit(
      editMotion({
        document: options.document(),
        edit:
          typeof edit === 'string'
            ? {motionId: activeMotion.id, type: edit}
            : {motionId: activeMotion.id, name: edit.name, type: 'rename'},
      }),
      'single',
    )
  }
  const renameById = (motionId: string, name: string) => {
    const result = editMotion({
      document: options.document(),
      edit: {motionId, name, type: 'rename'},
    })

    if (result === undefined) {
      return
    }

    options.setMotionTimes((current) => {
      const {[motionId]: renamedTime, ...remainingTimes} = current
      return renamedTime === undefined
        ? current
        : {...remainingTimes, [result.selectedMotionId ?? name]: renamedTime}
    })
    options.applyEdit(result, 'all')
  }

  return {
    add: () =>
      options.applyEdit(editMotion({document: options.document(), edit: {type: 'add'}}), 'single'),
    delete: () => applyActiveMotionEdit('delete'),
    deleteById: (motionId: string) =>
      options.applyEdit(
        editMotion({document: options.document(), edit: {motionId, type: 'delete'}}),
        'all',
      ),
    duplicate: () => applyActiveMotionEdit('duplicate'),
    rename: (name: string) => applyActiveMotionEdit({name}),
    renameById,
  }
}
