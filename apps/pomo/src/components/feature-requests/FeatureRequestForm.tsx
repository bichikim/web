import {createSignal, type JSX, onMount} from 'solid-js'
import * as m from '@paraglide/message'

import type {AuthController} from '../../features/auth/controller'
import {
  deleteFeatureRequestDraft,
  type FeatureRequestsController,
  readFeatureRequestDraft,
  writeFeatureRequestDraft,
} from '../../features/feature-requests'
import {PSettingsActionButton} from '../settings/ActionButton'
import {type FeatureRequestFormMessage, FeatureRequestFormModal} from './FeatureRequestFormModal'

interface FeatureRequestFormProps {
  readonly authentication: AuthController
  readonly model: FeatureRequestsController
}

const persistDraft = (title: string, description: string) => {
  writeFeatureRequestDraft({description, title, version: 1})
}

export const FeatureRequestForm = (props: FeatureRequestFormProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const [title, setTitle] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [formMessage, setFormMessage] = createSignal<FeatureRequestFormMessage | null>(null)
  const isCheckingAuthentication = () => props.authentication.state().kind === 'checking'

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle)
    persistDraft(nextTitle, description())
  }

  const handleDescriptionChange = (nextDescription: string) => {
    setDescription(nextDescription)
    persistDraft(title(), nextDescription)
  }

  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setFormMessage(null)
    setIsOpen(true)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen)
  }

  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    setFormMessage(null)
    const normalizedTitle = title().trim()

    if (normalizedTitle.length === 0) {
      setFormMessage('invalid')
      return
    }

    const result = await props.model.createRequest({
      description: description().trim(),
      title: normalizedTitle,
    })

    switch (result.status) {
      case 'created':
        deleteFeatureRequestDraft()
        setTitle('')
        setDescription('')
        setFormMessage('created')
        return
      case 'invalid':
        setFormMessage('invalid')
        return
      case 'unauthorized':
        setFormMessage('unauthorized')
        return
      case 'unavailable':
        setFormMessage('failed')
        return
      default: {
        const exhaustiveResult: never = result
        return exhaustiveResult
      }
    }
  }

  onMount(() => {
    const draft = readFeatureRequestDraft()
    if (draft === null) {
      return
    }

    setTitle(draft.title)
    setDescription(draft.description)
  })

  return (
    <>
      <PSettingsActionButton icon="i-tabler-plus" onPress={handleOpen}>
        {m.feature_request_new()}
      </PSettingsActionButton>

      <FeatureRequestFormModal
        authentication={props.authentication}
        description={description()}
        formMessage={formMessage}
        isCheckingAuthentication={isCheckingAuthentication()}
        isOpen={isOpen()}
        isSubmitting={props.model.isSubmitting()}
        onCloseAutoFocus={() => triggerElement()?.focus()}
        onDescriptionChange={handleDescriptionChange}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        onTitleChange={handleTitleChange}
        title={title()}
      />
    </>
  )
}
