# Atek Database API

`atek.cloud/adb-api`

```
npm install @atek-cloud/adb-api
```

```typescript
import adb from '@atek-cloud/adb-api'
import cats from 'example-cats-table'

// get or create a database under the 'mydb' alias
const db = adb.db('mydb')

// use the cats table
await cats(db).create({id: 'kit', name: 'Kit'})
await cats(db).list() // => {records: [{key: 'kit', value: {id: 'kit', name: 'Kit', createdAt: '2021-09-07T01:06:07.487Z'}}]}
await cats(db).get('kit') // => {key: 'kit', value: {id: 'kit', name: 'Kit', createdAt: '2021-09-07T01:06:07.487Z'}}
await cats(db).put('kit', {id: 'kit', name: 'Kitty'})
await cats(db).delete('kit')
```

See [The Atek DB Guide](https://atek.cloud/docs/manual/adb/intro) to learn how to use ADB.