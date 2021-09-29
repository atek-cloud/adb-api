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
  writable?: boolean = false
  isServerDb?: boolean = false
  owner?: {
    userKey?: string
    serviceKey?: string
  } = {serviceKey: ''}
  alias?: string = ''
  access?: string = ''
  createdAt?: string = ''
  static schema = {
    type: 'object',
    required: ['dbId'],
    properties: {
      dbId: {type: 'string'},
      writable: {type: 'boolean'},
      isServerDb: {type: 'boolean'},
      owner: {
        type: 'object',
        properties: {
          userKey: {type: 'string'},
          serviceKey: {type: 'string'}
        }
      },
      alias: {type: 'string'},
      access: {type: 'string'},
      createdAt: {
        type: 'string',
        format: 'date-time'
      }
    }
  }
}

export class DbConfig {
  alias?: string = ''
  access?: string = ''
  static schema = {
    type: 'object',
    properties: {
      alias: {type: 'string'},
      access: {type: 'string'}
    }
  }
}

export class DbAdminConfig {
  owner?: {
    userKey?: string
    serviceKey?: string
  } = {serviceKey: ''}
  alias?: string = ''
  access?: string = ''
  static schema = {
    type: 'object',
    properties: {
      owner: {
        type: 'object',
        properties: {
          userKey: {type: 'string'},
          serviceKey: {type: 'string'}
        }
      },
      alias: {type: 'string'},
      access: {type: 'string'}
    }
  }
}

export class Record<T = object> {
  valid? = true
  key: string = ''
  path: string = ''
  url: string = ''
  seq?: number
  // @ts-ignore an initializer is expected but that's a PITA for the generics -prf
  value: T
  static schema = {
    type: 'object',
    required: ['key', 'path', 'url'],
    properties: {
      key: {type: 'string'},
      path: {type: 'string'},
      url: {type: 'string'},
      seq: {type: 'number'},
      value: {type: 'object'}
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

type onInvalidHandler = 'ignore'|'throw'|'prune'|((record: Record)=>Record|boolean)

export interface ValidationOpts {
  onInvalid: onInvalidHandler
}

export class ListOpts implements ValidationOpts {
  onInvalid: onInvalidHandler = 'ignore'
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
  adminListDbsByOwningUser (owningUserKey: string): Promise<DbInfo[]>
  /**
   * @desc Create a new database under a specific service
   */
  adminCreateDb (config: DbAdminConfig): Promise<DbInfo>
  /**
   * @desc Edit a service's config for a database
   */
  adminEditDbConfig (dbId: string, config: DbAdminConfig): Promise<void>
  /**
   * @desc Delete a database
   */
  adminDeleteDb (dbId: string): Promise<void>

  /**
   * @desc Create a new database
   */
  dbCreate (opts: DbConfig): Promise<DbInfo>
  /**
   * @desc Get or create a database according to an alias. Database aliases are local to each application.
   */
  dbGetOrCreate (alias: string, opts: DbConfig): Promise<DbInfo>
  /**
   * @desc Configure a database's settings
   */
  dbConfigure (dbId: string, config: DbConfig): Promise<void>
  /**
   * @desc Get a database's settings
   */
  dbGetConfig (dbId: string): Promise<DbConfig>
  /**
   * @desc List all databases configured to the calling service
   */
  dbList (): Promise<DbInfo[]>
  /**
   * @desc Get metadata and information about a database.
   */
  dbDescribe (dbId: string): Promise<DbInfo>

  /**
   * @desc List records in a table.
   */
  recordList (dbId: string, path: string|string[], opts?: ListOpts): Promise<{records: Record[]}>
  /**
   * @desc Get a record in a table.
   */
  recordGet (dbId: string, path: string|string[]): Promise<Record>
  /**
   * @desc Write a record to a table.
   */
  recordPut (dbId: string, path: string|string[], value: object): Promise<Record>
  /**
   * @desc Delete a record from a table.
   */
  recordDelete (dbId: string, path: string|string[]): Promise<void>
  /**
   * @desc Enumerate the differences between two versions of the database.
   */
  recordDiff (dbId: string, opts: {left: number, right?: number, tableIds?: string[]}): Promise<Diff[]>
}

const pathParam = {oneOf: [{type: 'string'}, {type: 'array', items: {type: 'string'}}]}

export const AdbValidators = {
  init: {
    params: [AdbProcessConfig]
  },
  getConfig: {
    response: AdbProcessConfig
  },
  adminListDbsByOwningUser: {
    params: [{type: 'string'}],
    response: {type: 'array', items: DbInfo.schema}
  },
  dbCreate: {
    params: [DbConfig],
    response: DbInfo
  },
  dbGetOrCreate: {
    params: [{type: 'string'}, DbConfig],
    response: DbInfo
  },
  dbConfigure: {
    params: [{type: 'string'}, DbConfig]
  },
  dbGetConfig: {
    params: [{type: 'string'}],
    response: DbConfig
  },
  dbList: {
    response: {type: 'array', items: DbInfo.schema}
  },
  dbDescribe: {
    params: [{type: 'string'}],
    response: DbInfo
  },
  recordList: {
    params: [{type: 'string'}, pathParam, ListOpts],
    response: {type: 'object', properties: {records: {type: 'array', items: Record.schema}}}
  },
  recordGet: {
    params: [{type: 'string'}, pathParam],
    response: Record
  },
  recordPut: {
    params: [{type: 'string'}, pathParam, {type: 'object'}],
    response: Record
  },
  recordDelete: {
    params: [{type: 'string'}, pathParam]
  },
  recordDiff: {
    params: [{type: 'string'}, {type: 'object', properties: {left: {type: 'number'}, right: {type: 'number'}, tableIds: {type: 'array', items: {type: 'string'}}}}],
    response: {type: 'array', items: Diff.schema}
  }
}