const EMPTY_BUFFER = Buffer.alloc(0)

export class AdbProcessConfig {
  serverDbId: string = ''
  static schema = {
    type: 'object',
    properties: {
      serverDbId: {type: 'string'}
    }
  }
}

export class DbInfo {
  dbId: string = ''
  static schema = {
    type: 'object',
    properties: {
      dbId: {type: 'string'}
    }
  }
}

export class NetworkSettings {
  access?: string
  static schema = {
    type: 'object',
    properties: {
      access: {type: 'string'}
    }
  }
}

export class DbSettings {
  dbId?: string = ''
  type?: DbInternalType
  alias?: string // An alias ID for the application to reference the database.
  displayName?: string // The database's display name.
  tables?: string[] // The database's initial configured tables.
  network?: NetworkSettings // The database's network settings.
  persist?: boolean // Does this application want to keep the database in storage?
  presync?: boolean // Does this application want the database to be fetched optimistically from the network?
  static schema = {
    type: 'object',
    properties: {
      dbId: {type: 'string'},
      type: {type: 'string'},
      alias: {type: 'string'},
      displayName: {type: 'string'},
      tables: {type: 'array', items: {type: 'string'}},
      network: NetworkSettings.schema,
      persist: {type: 'boolean'},
      presync: {type: 'boolean'},
    }
  }
}

export enum DbInternalType {
  HYPERBEE = 'hyperbee'
}

export class TableTemplates {
  table?: {
    title?: string
    description?: string
  }
  record?: {
    key?: string
    title?: string
    description?: string
  }
  static schema = {
    type: 'object',
    properties: {
      table: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          description: {type: 'string'}
        }
      },
      record: {
        type: 'object',
        properties: {
          key: {type: 'string'},
          title: {type: 'string'},
          description: {type: 'string'}
        }
      }
    }
  }
}

export class TableSettings {
  revision?: number
  templates?: TableTemplates
  definition?: object
  static schema = {
    type: 'object',
    properties: {
      revision: {type: 'number'},
      templates: TableTemplates.schema,
      definition: {type: 'object'}
    }
  }
}

export class TableDescription extends TableSettings {
  tableId: string = ''
  static schema = {
    type: 'object',
    properties: {
      revision: {type: 'number'},
      templates: TableTemplates.schema,
      definition: {type: 'object'},
      tableId: {type: 'string'}
    }
  }
}

export class DbDescription {
  dbId: string = ''
  dbType: string = ''
  displayName?: string
  tables: TableDescription[] = []
  static schema = {
    type: 'object',
    properties: {
      dbId: {type: 'string'},
      dbType: {type: 'string'},
      displayName: {type: 'string'},
      tables: {
        type: 'array',
        items: TableDescription.schema
      }
    }
  }
}

export class Record<T = object> {
  key: string = ''
  path: string = ''
  url: string = ''
  seq?: number
  // @ts-ignore an initializer is expected but that's a PITA for the generics -prf
  value: T
  static schema = {
    type: 'object',
    required: ['key', 'path', 'url', 'value'],
    properties: {
      key: {type: 'string'},
      path: {type: 'string'},
      url: {type: 'string'},
      seq: {type: 'number'},
      value: {type: 'object'}
    }
  }
}

export interface BlobMap {
  [blobName: string]: BlobDesc
}

export class BlobDesc {
  mimeType?: string
  buf: Buffer = EMPTY_BUFFER
  static schema = {
    type: 'object',
    required: ['buf'],
    properties: {
      mimeType: {type: 'string'},
      buf: {type: 'string', contentEncoding: 'base64'}
    }
  }
}

export class Blob {
  start: number = 0
  end: number = 0
  mimeType?: string
  buf: Buffer = EMPTY_BUFFER
  static schema = {
    type: 'object',
    required: ['start', 'end', 'buf'],
    properties: {
      start: {type: 'number'},
      end: {type: 'number'},
      mimeType: {type: 'string'},
      buf: {type: 'string', contentEncoding: 'base64'}
    }
  }
}

export class Diff {
  left?: Record
  right?: Record
  static schema = {
    type: 'object',
    properties: {
      left: Record.schema,
      right: Record.schema
    }
  }
}

export class ListOpts {
  lt?: string
  lte?: string
  gt?: string
  gte?: string
  limit?: number
  reverse?: boolean
  static schema = {
    type: 'object',
    properties: {
      lt: {type: 'string'},
      lte: {type: 'string'},
      gt: {type: 'string'},
      gte: {type: 'string'},
      limit: {type: 'number'},
      reverse: {type: 'boolean'}
    }
  }
}

export interface AdbApi {
  /**
   * @desc Initialize the ADB process
   */
  init (config: AdbProcessConfig): Promise<void>
  /**
   * @desc Get the ADB process configuration
   */
  getConfig (): Promise<AdbProcessConfig>
  /**
   * @desc List databases owned by a given user
   */
  adminListDbsByOwningUser (owningUserKey: string): Promise<DbSettings[]>

  /**
   * @desc Create a new database
   */
  dbCreate (opts: DbSettings): Promise<DbInfo>
  /**
   * @desc Get or create a database according to an alias. Database aliases are local to each application.
   */
  dbGetOrCreate (alias: string, opts: DbSettings): Promise<DbInfo>
  /**
   * @desc Configure a database's settings
   */
  dbConfigure (dbId: string, config: DbSettings): Promise<void>
  /**
   * @desc Get a database's settings
   */
  dbGetConfig (dbId: string): Promise<DbSettings>
  /**
   * @desc List all databases configured to the calling service
   */
  dbList (): Promise<DbSettings[]>
  /**
   * @desc Get metadata and information about a database.
   */
  dbDescribe (dbId: string): Promise<DbDescription>

  /**
   * @desc Register a table's schema and metadata. 
   */
  tblDefine (dbId: string, tableId: string, desc: TableSettings): Promise<TableDescription>
  /**
   * @desc List records in a table.
   */
  tblList (dbId: string, tableId: string, opts?: ListOpts): Promise<{records: Record[]}>
  /**
   * @desc Get a record in a table.
   */
  tblGet (dbId: string, tableId: string, key: string): Promise<Record>
  /**
   * @desc Add a record to a table.
   */
  tblCreate (dbId: string, tableId: string, value: object, blobs?: BlobMap): Promise<Record>
  /**
   * @desc Write a record to a table.
   */
  tblPut (dbId: string, tableId: string, key: string, value: object): Promise<Record>
  /**
   * @desc Delete a record from a table.
   */
  tblDelete (dbId: string, tableId: string, key: string): Promise<void>
  /**
   * @desc Enumerate the differences between two versions of the database.
   */
  tblDiff (dbId: string, opts: {left: number, right?: number, tableIds?: string[]}): Promise<Diff[]>
  /**
   * @desc Get a blob of a record.
   */
  tblGetBlob (dbId: string, tableId: string, key: string, blobName: string): Promise<Blob>
  /**
   * @desc Write a blob of a record.
   */
  tblPutBlob (dbId: string, tableId: string, key: string, blobName: string, blobValue: BlobDesc): Promise<void>
  /**
   * @desc Delete a blob of a record.
   */
  tblDelBlob (dbId: string, tableId: string, key: string, blobName: string): Promise<void>
}

export const AdbValidators = {
  init: {
    params: [AdbProcessConfig]
  },
  getConfig: {
    response: AdbProcessConfig
  },
  adminListDbsByOwningUser: {
    params: [{type: 'string'}],
    response: {type: 'array', items: DbSettings.schema}
  },
  dbCreate: {
    params: [DbSettings],
    response: DbInfo
  },
  dbGetOrCreate: {
    params: [{type: 'string'}, DbSettings],
    response: DbInfo
  },
  dbConfigure: {
    params: [{type: 'string'}, DbSettings]
  },
  dbGetConfig: {
    params: [{type: 'string'}],
    response: DbSettings
  },
  dbList: {
    response: {type: 'array', items: DbSettings.schema}
  },
  dbDescribe: {
    params: [{type: 'string'}],
    response: DbDescription
  },
  tblDefine: {
    params: [{type: 'string'}, {type: 'string'}, TableSettings],
    response: TableDescription
  },
  tblList: {
    params: [{type: 'string'}, {type: 'string'}, ListOpts],
    response: {type: 'object', properties: {records: {type: 'array', items: Record.schema}}}
  },
  tblGet: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'string'}],
    response: Record
  },
  tblCreate: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'object'}, {type: 'object', patternProperties: {'.*': BlobDesc.schema}}],
    response: Record
  },
  tblPut: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'string'}, {type: 'object'}],
    response: Record
  },
  tblDelete: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'string'}]
  },
  tblDiff: {
    params: [{type: 'string'}, {type: 'object', properties: {left: {type: 'number'}, right: {type: 'number'}, tableIds: {type: 'array', items: {type: 'string'}}}}],
    response: {type: 'array', items: Diff.schema}
  },
  tblGetBlob: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'string'}, {type: 'string'}],
    response: Blob
  },
  tblPutBlob: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'string'}, {type: 'string'}, BlobDesc]
  },
  tblDelBlob: {
    params: [{type: 'string'}, {type: 'string'}, {type: 'string'}, {type: 'string'}]
  }
}