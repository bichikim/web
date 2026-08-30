import {requiredStringSchema} from './required'

/** Schema for an environment URL restricted to the given protocols. */
export const urlSchema = (name: string, protocols: ReadonlyArray<string>) =>
  requiredStringSchema(name).superRefine((value, context) => {
    let url: URL

    try {
      url = new URL(value)
    } catch {
      context.addIssue({
        code: 'custom',
        message: `${name} must be a valid URL`,
      })
      return
    }

    if (protocols.includes(url.protocol)) {
      return
    }

    context.addIssue({
      code: 'custom',
      message: `${name} must use ${protocols.join(' or ')}`,
    })
  })
