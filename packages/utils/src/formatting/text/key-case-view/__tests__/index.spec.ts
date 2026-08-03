import {describe, expect, expectTypeOf, it} from 'vitest'
import {createCamelCaseView, createKeyCase, createKeyCaseView, createSnakeCase} from '../'

const symbolKey = Symbol('symbolKey')

describe('createKeyCaseView', () => {
  it.each([
    {
      results: [
        //
        {get: (value) => value.id, result: 123},
        {get: (value) => value.name, result: 'John Doe'},
        {get: (value) => value.age, result: 30},
        {get: (value) => value.address.street, result: '123 Main St'},
        {get: (value) => value.address.city, result: 'Anytown'},
        {get: (value) => value.address.state, result: 'CA'},
        {get: (value) => value.address.zip, result: '12345'},
      ],
      value: {
        ADDRESS: {
          CITY: 'Anytown',
          STATE: 'CA',
          STREET: '123 Main St',
          ZIP: '12345',
        },
        AGE: 30,
        ID: 123,
        NAME: 'John Doe',
      },
    },
    {
      results: [
        //
        {get: (value) => value.id, result: 123},
        {get: (value) => value.name, result: 'John Doe'},
        {get: (value) => value.age, result: 30},
        {get: (value) => value.address.city, result: 'Anytown'},
        {get: (value) => value.address.tags, result: ['tag1', 'tag2']},
      ],
      value: {
        ADDRESS: {
          CITY: 'Anytown',
          TAGS: ['tag1', 'tag2'],
        },
        AGE: 30,
        ID: 123,
        NAME: 'John Doe',
      },
    },
    {
      results: [
        //
        {get: (value) => value.id, result: 123},
        {get: (value) => value.name, result: 'John Doe'},
        {get: (value) => value.age, result: 30},
        {get: (value) => value.address.city, result: 'Anytown'},
        {get: (value) => value.address.member[0].id, result: 1},
        {get: (value) => value.address.member[1].id, result: 2},
      ],
      value: {
        ADDRESS: {
          CITY: 'Anytown',
          MEMBER: [
            {
              ID: 1,
              NAME: 'John',
            },
            {
              ID: 2,
              NAME: 'Jane',
            },
          ],
        },
        AGE: 30,
        ID: 123,
        NAME: 'John Doe',
      },
    },
    {
      results: [
        //
        {get: (value) => value[symbolKey], result: 10},
      ],
      value: {
        ADDRESS: {
          CITY: 'Anytown',
          MEMBER: [
            {
              ID: 1,
              NAME: 'John',
            },
            {
              ID: 2,
              NAME: 'Jane',
            },
          ],
        },
        AGE: 30,
        [symbolKey]: 10,
      },
    },
  ])('should resolve requested keys without copying the source', ({results, value}) => {
    const transformedObject = createKeyCaseView(value, (key) => key.toUpperCase())

    for (const result of results) {
      if (typeof result.result === 'object') {
        expect(result.get(transformedObject)).toEqual(result.result)
      } else {
        expect(result.get(transformedObject)).toBe(result.result)
      }
    }
  })

  it('should retain source keys when enumerated', () => {
    const view = createKeyCaseView({FIRST_NAME: 'John'}, (key) => key.toUpperCase())

    expect(Object.keys(view)).toEqual(['FIRST_NAME'])
  })
})

describe('createCamelCaseView', () => {
  it('should expose snake case source keys as a readonly camel case view', () => {
    const originalObject = {
      foo_age: 30,
      foo_member: {
        // oxlint-disable-next-line eslint-js/camelcase
        bar_member: {
          number_id: 2,
          number_name: 'Bar',
        },
        number_id: 1,
        number_name: 'John',
      },
      foo_name: 'John Doe',
    }
    const transformedObject = createCamelCaseView(originalObject)

    expect(transformedObject.fooAge).toBe(30)
    expect(transformedObject.fooName).toBe('John Doe')
    expect(transformedObject.fooMember.numberId).toBe(1)
    expect(transformedObject.fooMember.numberName).toBe('John')
    expect(transformedObject.fooMember.barMember.numberId).toBe(2)
    expect(transformedObject.fooMember.barMember.numberName).toBe('Bar')

    expectTypeOf(transformedObject).toEqualTypeOf<{
      readonly fooAge: number
      readonly fooMember: {
        readonly barMember: {
          readonly numberId: number
          readonly numberName: string
        }
        readonly numberId: number
        readonly numberName: string
      }
      readonly fooName: string
    }>()
  })

  it('should preserve nested null values', () => {
    const transformedObject = createCamelCaseView({optional_value: null})

    expect(transformedObject.optionalValue).toBeNull()
  })

  it('should not violate proxy invariants for frozen properties', () => {
    const nested = {number_id: 1}
    const transformedObject = createCamelCaseView(Object.freeze({nested}))

    expect(transformedObject.nested).toBe(nested)
  })

  it('should expose nested arrays as readonly views without copying them', () => {
    const source = [{number_id: 1}]
    const view = createCamelCaseView(source)

    expect(view[0]?.numberId).toBe(1)
    expectTypeOf(view).toEqualTypeOf<readonly {readonly numberId: number}[]>()
  })

  it('should preserve the deprecated aliases', () => {
    const genericView = createKeyCase({FIRST_NAME: 'John'}, (key) => key.toUpperCase())
    const camelCaseView = createSnakeCase({first_name: 'John'})

    expect(genericView.FIRST_NAME).toBe('John')
    expect(camelCaseView.firstName).toBe('John')
  })
})
