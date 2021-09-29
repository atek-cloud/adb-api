import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { JsonPointer } from 'json-ptr'
import createMlts from 'monotonic-lexicographic-timestamp'

const VALID_PTR_RESULT_TYPES = ['number', 'string', 'boolean']
export const ajv = new Ajv({strictTuples: false})
addFormats(ajv)
const mlts = createMlts()

export interface Validator {
  validate: (v: any) => boolean
  assert: (v: any) => void
}

export interface PkeyFunction {
  (value: object): string
}

export function createValidator (schema: object): Validator {
  const validate = ajv.compile(schema)
  return {
    validate: (value: any) => validate(value),
    assert: (value: any) => {
      const valid = validate(value)
      if (!valid) {
        const what = validate.errors?.[0].propertyName || validate.errors?.[0].instancePath
        throw new ValidationError(`${what} ${validate.errors?.[0].message}`)
      }
    }
  }
}

export class ValidationError extends Error {
  code: string
  rpcCode: number

  constructor (msg: string) {
    super(msg)
    this.name = this.constructor.name
    this.message = msg
    this.code = 'validation-error'
    this.rpcCode = -32002
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = (new Error(msg)).stack
    }
  }
}

export function createPkeyFn (template: string|string[]|undefined): PkeyFunction {
  if (!template) return () => mlts()
  template = Array.isArray(template) ? template : [template]
  const fns = template.map((part, i) => {
    const ptr = JsonPointer.create(part)
    return (value: object) => {
      const res = ptr.get(value)
      if (!VALID_PTR_RESULT_TYPES.includes(typeof res)) {
        throw new Error(`Unable to generate key, ${part} found type ${typeof res}`)
      }
      return res
    }
  })
  return (value: object) => {
    return fns.map(fn => fn(value)).join(',')
  }
}