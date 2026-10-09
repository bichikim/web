import {createSignal, type JSX, onMount} from 'solid-js'
import * as m from '@paraglide/message'

import type {AuthController} from '../../features/auth/controller'
import {
  deleteFeatureRequestDraft,
  type FeatureRequestsController,
  readFeatureRequestDraft,
  writeFeatureRequestDraft,
} from '../../features/feature-requests'
import {
  MAXIMUM_FEATURE_REQUEST_DESCRIPTION_LENGTH,
  MAXIMUM_FEATURE_REQUEST_TITLE_LENGTH,
} from '../../features/feature-requests/limits'
import {PSettingsActionButton} from '../settings/ActionButton'
import {type FeatureRequestFormMessage, FeatureRequestFormModal} from './FeatureRequestFormModal'

interface FeatureRequestFormProps {
  readonly authentication: AuthController
  readonly model: FeatureRequestsController
}

const persistDraft = (title: string, description: string) => {
  writeFeatureRequestDraft({description, title, version: 1})
}

type FeatureRequestInputValidation =
  | {readonly status: 'invalid'}
  | {readonly status: 'too-long'}
  | {
      readonly input: {readonly description: string; readonly title: string}
      readonly status: 'valid'
    }

const validateFeatureRequestInput = (
  title: string,
  description: string,
): FeatureRequestInputValidation => {
  const normalizedInput = {description: description.trim(), title: title.trim()}

  if (normalizedInput.title.length === 0) {
    return {status: 'invalid'}
  }

  if (
    normalizedInput.title.length > MAXIMUM_FEATURE_REQUEST_TITLE_LENGTH ||
    normalizedInput.description.length > MAXIMUM_FEATURE_REQUEST_DESCRIPTION_LENGTH
  ) {
    return {status: 'too-long'}
  }

  return {input: normalizedInput, status: 'valid'}
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
    const validation = validateFeatureRequestInput(title(), description())

    if (validation.status === 'invalid') {
      setFormMessage('invalid')
      return
    }

    if (validation.status === 'too-long') {
      setFormMessage('invalid_request')
      return
    }

    const result = await props.model.createRequest(validation.input)

    switch (result.status) {
      case 'created':
        deleteFeatureRequestDraft()
        setTitle('')
        setDescription('')
        setFormMessage('created')
        return
      case 'invalid':
        setFormMessage('invalid_request')
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
