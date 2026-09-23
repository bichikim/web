import {type Accessor, type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'

import type {AuthController} from '../../features/auth/controller'
import {PButton} from '../p-button/PButton'
import {PFormMessage} from '../p-form-message/PFormMessage'
import {PModal} from '../p-modal/PModal'
import {PTextField} from '../p-text-field/PTextField'

export type FeatureRequestFormMessage = 'created' | 'failed' | 'invalid' | 'unauthorized'

interface FeatureRequestFormModalProps {
  readonly authentication: AuthController
  readonly description: string
  readonly formMessage: Accessor<FeatureRequestFormMessage | null>
  readonly isCheckingAuthentication: boolean
  readonly isOpen: boolean
  readonly isSubmitting: boolean
  readonly onCloseAutoFocus: () => void
  readonly onDescriptionChange: (description: string) => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent>
  readonly onTitleChange: (title: string) => void
  readonly title: string
}

export const FeatureRequestFormModal = (props: FeatureRequestFormModalProps) => {
  const isAuthenticated = () => props.authentication.session() !== null

  return (
    <PModal
      description={m.feature_request_new_description()}
      isOpen={props.isOpen}
      onCloseAutoFocus={props.onCloseAutoFocus}
      onOpenChange={props.onOpenChange}
      placement="top"
      title={m.feature_request_new()}
    >
      <Show when={props.isOpen}>
        <div class="grid gap-4">
          <Show
            fallback={
              <p class="m-0 rounded-panel-inner bg-content-surface px-4 py-3 text-sm leading-6 text-muted-foreground">
                {m.feature_request_sign_in_description()}{' '}
                <a
                  class="font-750 text-highlight underline-offset-3 hover:underline"
                  href="/account"
                >
                  {m.feature_request_sign_in()}
                </a>
              </p>
            }
            when={isAuthenticated()}
          >
            <form class="grid gap-4" onSubmit={(event) => props.onSubmit(event)}>
              <PTextField
                disabled={props.isSubmitting || props.isCheckingAuthentication}
                label={m.feature_request_title_label()}
                onChange={props.onTitleChange}
                placeholder={m.feature_request_title_placeholder()}
                required
                value={props.title}
              />
              <PTextField
                description={m.feature_request_details_hint()}
                disabled={props.isSubmitting || props.isCheckingAuthentication}
                label={m.feature_request_details_label()}
                multiline
                onChange={props.onDescriptionChange}
                placeholder={m.feature_request_details_placeholder()}
                rows={3}
                value={props.description}
              />
              <PButton
                class="w-full"
                disabled={props.isSubmitting || props.isCheckingAuthentication}
                raised
                type="submit"
              >
                {props.isSubmitting ? m.feature_request_submitting() : m.feature_request_submit()}
              </PButton>
            </form>
          </Show>

          <Show when={props.formMessage()}>
            {(message) => (
              <Show
                fallback={
                  <PFormMessage tone="error">
                    {message() === 'invalid'
                      ? m.feature_request_invalid()
                      : message() === 'unauthorized'
                        ? m.feature_request_sign_in_required()
                        : m.feature_request_create_failed()}
                  </PFormMessage>
                }
                when={message() === 'created'}
              >
                <PFormMessage tone="success">{m.feature_request_created()}</PFormMessage>
              </Show>
            )}
          </Show>
        </div>
      </Show>
    </PModal>
  )
}
