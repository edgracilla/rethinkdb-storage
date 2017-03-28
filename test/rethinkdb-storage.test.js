/* global describe, it, after, before */
'use strict'

const amqp = require('amqplib')
const moment = require('moment')
const should = require('should')

const ID = new Date().getTime()
const INPUT_PIPE = 'demo.pipe.storage'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let _app = null
let _conn = null
let _channel = null

let conf = {
  host: 'localhost',
  port: '28015',
  database: 'reekoh_db',
  table: 'reekoh_table',
  user: undefined, // optional in test
  password: undefined // optional in test
}

let record = {
  id: ID,
  co2: '11%',
  temp: 23,
  quality: ID,
  reading_time: '2015-11-27T11:04:13.539Z',
  random_data: 'abcdefg',
  is_normal: 'true'
}

describe('RethinkDB Storage', function () {

  before('init', () => {
    process.env.BROKER = BROKER
    process.env.INPUT_PIPE = INPUT_PIPE
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate', function () {
    _conn.close()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(8000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data', function () {
    it('should process the data', function (done) {
      if(_channel.sendToQueue(INPUT_PIPE, new Buffer(JSON.stringify(record)))) {
        done()
      }
    })
  })

  describe('#data', function () {
    it('should have inserted the data', function (done) {
      this.timeout(20000)

      let rdb = require('rethinkdb')

      let connInfo = {
        host: conf.host,
        port: conf.port,
        db: conf.database,
        table: conf.table
      }

      rdb.connect(connInfo, function (err, conn) {
        if (err) throw err

        rdb.table(conf.table).filter(rdb.row('id').eq(ID)).run(conn, function (err, cursor) {
          if (err) throw err

          cursor.toArray(function (err, result) {
            if (err) throw err

            should.equal(record.co2, result[0].co2, 'Data validation failed. Field: co2')
            should.equal(record.is_normal, result[0].is_normal, 'Data validation failed. Field: is_normal')
            should.equal(record.quality, result[0].quality, 'Data validation failed. Field: quality')
            should.equal(record.random_data, result[0].random_data, 'Data validation failed. Field: random_data')
            should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), moment(result[0].reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: reading_time')
            should.equal(record.temp, result[0].temp, 'Data validation failed. Field: temp')
            done()
          })
        })
      })
    })
  })
})
