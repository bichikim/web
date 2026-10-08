/** Identifies a locally rejected job before any provider request is submitted. */
export class ApiAiAdmissionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiAiAdmissionError'
  }
}
