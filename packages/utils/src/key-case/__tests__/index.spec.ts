/* eslint-disable camelcase */
import {assertType, describe, expect, it} from 'vitest'
import {createKeyCase, createSnakeCase} from '../'

describe.skip('createKeyMatch function', () => {
  it('should return a new object with transformed keys', () => {
    const originalObject = {
      AGE: 30,
      ID: 123,
      NAME: 'John Doe',
    }
    const transformedObject = createKeyCase(originalObject, (key) => key.toUpperCase())

    expect(transformedObject.id).toBe(123)
    expect(transformedObject.name).toBe('John Doe')
    expect(transformedObject.age).toBe(30)
  })
})
const symbolKey = Symbol('symbolKey')

describe('createKeyMatch function', () => {
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
  ])('should return a new object with transformed keys', ({results, value}) => {
    const transformedObject = createKeyCase(value, (key) => key.toUpperCase())

    for (const result of results) {
      if (typeof result.result === 'object') {
        expect(result.get(transformedObject)).toEqual(result.result)
      } else {
        expect(result.get(transformedObject)).toBe(result.result)
      }
    }
  })
})

describe('createSnakeCaseMatch function', () => {
  it('should return a new object with transformed keys', () => {
    const originalObject = {
      foo_age: 30,
      foo_member: {
        bar_member: {
          number_id: 2,
          number_name: 'Bar',
        },
        number_id: 1,
        number_name: 'John',
      },
      foo_name: 'John Doe',
    }
    const transformedObject = createSnakeCase(originalObject)

    expect(transformedObject.fooAge).toBe(30)
    expect(transformedObject.fooName).toBe('John Doe')
    expect(transformedObject.fooMember.numberId).toBe(1)
    expect(transformedObject.fooMember.numberName).toBe('John')
    expect(transformedObject.fooMember.barMember.numberId).toBe(2)
    expect(transformedObject.fooMember.barMember.numberName).toBe('Bar')

    assertType<{
      fooAge: number
      fooMember: {
        barMember: {
          numberId: number
          numberName: string
        }
        numberId: number
        numberName: string
      }
      fooName: string
    }>(transformedObject)
  })
})
