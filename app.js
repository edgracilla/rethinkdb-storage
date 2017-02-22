'use strict'

const reekoh = require('reekoh')
const plugin = new reekoh.plugins.Storage()

const rdb = require('rethinkdb')
const isPlainObject = require('lodash.isplainobject')

let tableName = null
let connection = null

plugin.on('data', (data) => {
  if (isPlainObject(data) || Array.isArray(data)) {
    rdb.table(tableName).insert(data).run(connection, (insertError) => {
      if (insertError) {
        console.error('Error inserting record on RethinkDB.', insertError)
        plugin.logException(insertError)
      } else {
        plugin.log(JSON.stringify({
          title: 'Record Successfully inserted to RethinkDB.',
          data: data
        }))
      }
    })
  } else {
    plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`))
  }
})

plugin.once('ready', () => {
  tableName = plugin.config.table

  let connInfo = {
    host: plugin.config.host,
    port: plugin.config.port,
    db: plugin.config.database,
    table: plugin.config.table,
    user: plugin.config.user,
    password: plugin.config.password
  }

  rdb.connect(connInfo, (connectionError, conn) => {
    if (connectionError) {
      console.error('Error connecting to RethinkDB Database Server.', connectionError)
      plugin.logException(connectionError)

      return setTimeout(function () {
        process.exit(1)
      }, 5000)
    } else {
      connection = conn
      plugin.log('RethinkDB Storage has been initialized.')
      plugin.emit('init')
    }
  })
})

module.exports = plugin
