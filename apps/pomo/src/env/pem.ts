import {requiredStringSchema} from './required'

/** Schema for a PEM environment value with restored line breaks. */
export const pemSchema = (name: string, labels: ReadonlyArray<string>) =>
  requiredStringSchema(name)
    .transform((value) => value.replaceAll('\\n', '\n').replaceAll('\r\n', '\n').trim())
    .superRefine((pem, context) => {
      const hasExpectedEnvelope = labels.some(
        (label) =>
          pem.startsWith(`-----BEGIN ${label}-----\n`) && pem.endsWith(`-----END ${label}-----`),
      )

      if (hasExpectedEnvelope) {
        return
      }

      context.addIssue({
        code: 'custom',
        message: `${name} must contain a valid PEM value`,
      })
    })
