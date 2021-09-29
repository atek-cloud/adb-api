import { rpc, createRpcServer } from '@atek-cloud/node-rpc'
import { createValidator, Validator, createPkeyFn } from './util.js'
import { AdbApi, AdbValidators, DbConfig, ListOpts, Record, ValidationOpts } from './types.js'
export * from './types.js'

const HYPER_KEY_RE = /([0-9a-f]{64})/i
export const ID = 'atek.cloud/adb-api'

export function createClient () {
  return rpc<AdbApi>(ID)
}

export function createServer (handlers: any) {
  return createRpcServer(handlers, AdbValidators)
}

export class AdbDatabase {
  public isReady: Promise<any>
  constructor (public api: AdbApi, public dbId: string, opts?: DbConfig) {
    opts = opts || {}
    if (!dbId) {
      this.isReady = api.dbCreate(opts).then(res => {
        this.dbId = res.dbId
      })
    } else if (!HYPER_KEY_RE.test(dbId)) {
      this.isReady = api.dbGetOrCreate(dbId, opts).then(res => {
        this.dbId = res.dbId
      })
    } else {
      this.isReady = Promise.resolve(undefined)
    }
  }
  
  /**
  * @desc Get metadata and information about the database.
  */
  async describe () {
    await this.isReady
    return this.api.dbDescribe(this.dbId)
  }
    
  /**
  * @desc List records in a table.
  */
  async list (path: string|string[], opts?: ListOpts) {
    await this.isReady
    return this.api.recordList(this.dbId, path, opts)
  }

  /**
  * @desc Get a record in a table.
  */
  async get (path: string|string[]) {
    await this.isReady
    return this.api.recordGet(this.dbId, path)
  }

  /**
  * @desc Write a record to a table.
  */
  async put (path: string|string[], value: object) {
    await this.isReady
    return this.api.recordPut(this.dbId, path, value)
  }

  /**
  * @desc Delete a record from a table.
  */
  async delete (path: string|string[]) {
    await this.isReady
    return this.api.recordDelete(this.dbId, path)
  }

  /**
  * @desc Enumerate the differences between two versions of the database.
  */
   // TODO
  // async diff (opts: {left: number, right?: number, tableIds?: string[]}) {
  //   await this.isReady
  //   return this.api.recordDiff(this.dbId, opts)
  // }
}

export interface AdbSchemaOpts {
  pkey?: string|string[]
  jsonSchema?: object
}

export class AdbSchema<T extends object = object> {
  path: string[]
  isReady: Promise<any>
  pkey?: string|string[]
  pkeyFn = createPkeyFn(undefined)
  jsonSchema?: object
  validator?: Validator
  constructor (public db: AdbDatabase, path: string|string[], opts?: AdbSchemaOpts) {
    this.path = (Array.isArray(path) ? path : path.split('/')).filter(Boolean)
    this.isReady = db.isReady
    this.pkey = opts?.pkey
    if (this.pkey) this.pkeyFn = createPkeyFn(this.pkey)
    this.jsonSchema = opts?.jsonSchema
    this.validator = opts?.jsonSchema ? createValidator(opts.jsonSchema) : undefined
  }

  get schemaHasCreatedAt () {
    // @ts-ignore Yeah yeah yeah objects are useless types
    return (this.jsonSchema && (this.jsonSchema.properties?.createdAt || this.jsonSchema.oneOf?.every?.(obj => obj.properties.createdAt)))
  }

  /**
  * @desc List records in the schema.
  */
   async list (opts?: ListOpts): Promise<{records: Record<T>[]}> {
    await this.isReady
    const res = await (this.db.api.recordList(this.db.dbId, this.path, opts) as Promise<{records: Record<T>[]}>)
    if (this.validator) {
      res.records = res.records.filter((r: Record<object>) => {
        r.valid = true
        if (!this.validator?.validate(r.value)){
          r.valid = false
          if (opts?.onInvalid === 'prune') return false
          if (opts?.onInvalid === 'throw') this.validator?.assert(r.value)
          if (typeof opts?.onInvalid === 'function') {
            const vres = opts?.onInvalid(r)
            if (!vres || typeof vres === 'boolean') return vres
            Object.assign(r, vres)
          }
        }
        return true
      })
    }
    return res
  }

  /**
  * @desc Get a record in the schema space.
  */
  async get (key: string, opts?: ValidationOpts): Promise<Record<T>|undefined> {
    await this.isReady
    const record = await (this.db.api.recordGet(this.db.dbId, [...this.path, key]) as Promise<Record<T>>)
    if (this.validator) {
      record.valid = true
      if (!this.validator?.validate(record.value)){
        record.valid = false
        if (opts?.onInvalid === 'prune') return undefined
        if (opts?.onInvalid === 'throw') this.validator?.assert(record.value)
        if (typeof opts?.onInvalid === 'function') {
          const vres = opts?.onInvalid(record)
          if (!vres) return undefined
          else if (typeof vres === 'object') {
            Object.assign(record, vres)
          }
        }
      }
    }
    return record
  }

  /**
  * @desc Add a record to the schema space.
  */
  async create (value: T, opts?: ValidationOpts): Promise<Record<T>|undefined> {
    await this.isReady
    const key = this.pkeyFn(value)
    if (this.schemaHasCreatedAt && value && !('createdAt' in value)) {
      // @ts-ignore We don't know T but we can be pretty sure it's an object
      value.createdAt = (new Date()).toISOString()
    }
    return this.put(key, value, opts)
  }

  /**
  * @desc Write a record to the schema space.
  */
  async put (key: string, value: T, opts?: ValidationOpts): Promise<Record<T>|undefined> {
    await this.isReady
    if (this.validator) {
      if (!opts || opts.onInvalid === 'throw') {
        this.validator.assert(value)
      } else {
        if (opts.onInvalid === 'prune') {
          return Promise.resolve(undefined)
        } else if (typeof opts.onInvalid === 'function') {
          const rpath = `/${this.path.join('/')}/${key}`
          const vres = opts?.onInvalid({valid: false, key, path: rpath, url: `hyper://${this.db.dbId}${rpath}`, value})
          if (!vres) return undefined
          else if (vres === true) {/*ignore*/}
          else {
            // @ts-ignore it's fine
            value = (vres as Record<T>).value
          }
        }
      }
    }
    return this.db.api.recordPut(this.db.dbId, [...this.path, key], value) as Promise<Record<T>>
  }

  /**
  * @desc Delete a record from the schema space.
  */
  async delete (key: string) {
    await this.isReady
    return this.db.api.recordDelete(this.db.dbId, [...this.path, key])
  }

  /**
  * @desc Enumerate the differences between two versions of the database.
  */
   // TODO
  // async diff (opts: {left: number, right?: number}) {
  //   await this.isReady
  //   return this.db.api.recordDiff(this.db.dbId, opts)
  // }
}

export function defineSchema<T extends object = object>(path: string|string[], opts?: AdbSchemaOpts) {
  const dbApis = new Map()
  const factory = (db: AdbDatabase) => {
    if (dbApis.get(db)) {
      return dbApis.get(db)
    }
    const dbApi = new AdbSchema<T>(db, path, opts)
    dbApis.set(db, dbApi)
    return dbApi
  }
  return factory
}

const api = createClient()
export default {
  api,
  db (dbId: string|DbConfig, opts?: DbConfig) {
    if (typeof dbId === 'string') {
      return new AdbDatabase(this.api, dbId, opts)
    } else {
      return new AdbDatabase(this.api, '', dbId)
    }
  }
}
