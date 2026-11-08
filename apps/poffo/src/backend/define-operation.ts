import {z} from 'zod'

export const defineOperation = <Schema extends z.ZodType>(
  id: string,
  description: string,
  input: Schema,
  run: (input: z.output<Schema>, requestId: string) => unknown | Promise<unknown>,
) => ({
  description,
  id,
  inputSchema: z.toJSONSchema(input, {io: 'input', unrepresentable: 'any'}),
  run: (value: unknown, requestId: string) => run(input.parse(value ?? {}), requestId),
})
