import {apiAiAttempts, apiAiCallbacks, apiAiJobs} from 'src/server/database'

export const apiAiJobSelection = {
  activeAttemptId: apiAiJobs.activeAttemptId,
  body: apiAiJobs.body,
  cancelRequestedAt: apiAiJobs.cancelRequestedAt,
  id: apiAiJobs.id,
  kind: apiAiJobs.kind,
  ownerId: apiAiJobs.ownerId,
  result: apiAiJobs.result,
  status: apiAiJobs.status,
}

export const apiAiAttemptSelection = {
  deadlineAt: apiAiAttempts.deadlineAt,
  id: apiAiAttempts.id,
  jobId: apiAiAttempts.jobId,
  modelId: apiAiAttempts.modelId,
  providerId: apiAiAttempts.providerId,
  responseId: apiAiAttempts.responseId,
}

export const apiAiCallbackSelection = {
  eventId: apiAiCallbacks.eventId,
  eventType: apiAiCallbacks.eventType,
  id: apiAiCallbacks.id,
  providerId: apiAiCallbacks.providerId,
  responseId: apiAiCallbacks.responseId,
}
