import { rpc, createRpcServer } from '@atek-cloud/node-rpc'
import { AdbApi, AdbValidators, DbSettings, TableSettings, ListOpts, BlobMap, BlobDesc, Record } from './types.js'
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
  public isReady: Promise<any>|undefined
  constructor (public api: AdbApi, public dbId: string, opts?: DbSettings) {
    if (opts) {
      if (!dbId) {
        this.isReady = api.dbCreate(opts).then(res => {
          this.dbId = res.dbId
        })
      } else if (!HYPER_KEY_RE.test(dbId)) {
        this.isReady = api.dbGetOrCreate(dbId, opts).then(res => {
          this.dbId = res.dbId
        })
      }
      if (!this.isReady) {
        this.isReady = Promise.resolve(undefined)
      }
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
  * @desc Register a table's schema and metadata. 
  */
  async define (tableId: string, desc: TableSettings) {
    await this.isReady
    return this.api.tblDefine(this.dbId, tableId, desc)
  }
  
  /**
  * @desc List records in a table.
  */
  async list (tableId: string, opts?: ListOpts) {
    await this.isReady
    return this.api.tblList(this.dbId, tableId, opts)
  }

  /**
  * @desc Get a record in a table.
  */
  async get (tableId: string, key: string) {
    await this.isReady
    return this.api.tblGet(this.dbId, tableId, key)
  }

  /**
  * @desc Add a record to a table.
  */
  async create (tableId: string, value: object, blobs?: BlobMap) {
    await this.isReady
    return this.api.tblCreate(this.dbId, tableId, value, blobs)
  }

  /**
  * @desc Write a record to a table.
  */
  async put (tableId: string, key: string, value: object) {
    await this.isReady
    return this.api.tblPut(this.dbId, tableId, key, value)
  }

  /**
  * @desc Delete a record from a table.
  */
  async delete (tableId: string, key: string) {
    await this.isReady
    return this.api.tblDelete(this.dbId, tableId, key)
  }

  /**
  * @desc Enumerate the differences between two versions of the database.
  */
  async diff (opts: {left: number, right?: number, tableIds?: string[]}) {
    await this.isReady
    return this.api.tblDiff(this.dbId, opts)
  }

  /**
  * @desc Get a blob of a record.
  */
  async getBlob (tableId: string, key: string, blobName: string) {
    await this.isReady
    return this.api.tblGetBlob(this.dbId, tableId, key, blobName)
  }

  /**
  * @desc Write a blob of a record.
  */
  async putBlob (tableId: string, key: string, blobName: string, blobValue: BlobDesc) {
    await this.isReady
    return this.api.tblPutBlob(this.dbId, tableId, key, blobName, blobValue)
  }

  /**
  * @desc Delete a blob of a record.
  */
  async delBlob (tableId: string, key: string, blobName: string) {
    await this.isReady
    return this.api.tblDelBlob(this.dbId, tableId, key, blobName)
  }
}

export class AdbTable<T extends object = object> {
  public isReady: Promise<any>
  constructor (public db: AdbDatabase, public tableId: string, public tableDesc: TableSettings) {
    this.isReady = db.define(tableId, tableDesc)
  }

  /**
  * @desc List records in the table.
  */
   async list (opts?: ListOpts): Promise<{records: Record<T>[]}> {
    await this.isReady
    return this.db.api.tblList(this.db.dbId, this.tableId, opts) as Promise<{records: Record<T>[]}>
  }

  /**
  * @desc Get a record in the table.
  */
  async get (key: string): Promise<Record<T>> {
    await this.isReady
    return this.db.api.tblGet(this.db.dbId, this.tableId, key) as Promise<Record<T>>
  }

  /**
  * @desc Add a record to the table.
  */
  async create (value: T, blobs?: BlobMap): Promise<Record<T>> {
    await this.isReady
    return this.db.api.tblCreate(this.db.dbId, this.tableId, value, blobs) as Promise<Record<T>>
  }

  /**
  * @desc Write a record to the table.
  */
  async put (key: string, value: T): Promise<Record<T>> {
    await this.isReady
    return this.db.api.tblPut(this.db.dbId, this.tableId, key, value) as Promise<Record<T>>
  }

  /**
  * @desc Delete a record from the table.
  */
  async delete (key: string) {
    await this.isReady
    return this.db.api.tblDelete(this.db.dbId, this.tableId, key)
  }

  /**
  * @desc Enumerate the differences between two versions of the database.
  */
  async diff (opts: {left: number, right?: number}) {
    await this.isReady
    return this.db.api.tblDiff(this.db.dbId, Object.assign({}, opts, {tableIds: [this.tableId]}))
  }

  /**
  * @desc Get a blob of a record.
  */
  async getBlob (key: string, blobName: string) {
    await this.isReady
    return this.db.api.tblGetBlob(this.db.dbId, this.tableId, key, blobName)
  }

  /**
  * @desc Write a blob of a record.
  */
  async putBlob (key: string, blobName: string, blobValue: BlobDesc) {
    await this.isReady
    return this.db.api.tblPutBlob(this.db.dbId, this.tableId, key, blobName, blobValue)
  }

  /**
  * @desc Delete a blob of a record.
  */
  async delBlob (key: string, blobName: string) {
    await this.isReady
    return this.db.api.tblDelBlob(this.db.dbId, this.tableId, key, blobName)
  }
}

export function defineTable<T extends object = object>(tableId: string, desc: TableSettings) {
  const dbApis = new Map()
  const factory = (db: AdbDatabase) => {
    if (dbApis.get(db)) {
      return dbApis.get(db)
    }
    const dbApi = new AdbTable<T>(db, tableId, desc)
    dbApis.set(db, dbApi)
    return dbApi
  }
  return factory
}

const api = createClient()
export default {
  api,
  db (dbId: string|DbSettings, opts?: DbSettings) {
    if (typeof dbId === 'string') {
      return new AdbDatabase(this.api, dbId, opts)
    } else {
      return new AdbDatabase(this.api, '', dbId)
    }
  }
}
