'use strict';

var cp     = require('child_process'),
	assert = require('assert'),
	should = require('should'),
	moment = require('moment'),
	storage;

var HOST     = 'aws-us-east-1-portal.11.dblayer.com',
	PORT     = 27456,
	DATABASE = 'reekoh_db',
	TABLE    = 'reekoh_table',
	USER     = 'x',
	PASSWORD = 'opTrKxkoAsCvIqTjeP7ik9Yt-u--h8LXL1w_QnioVNE',
	ID       = new Date().getTime();

var record = {
	id: ID,
	co2: '11%',
	temp: 23,
	quality: ID,
	reading_time: '2015-11-27T11:04:13.539Z',
	random_data: 'abcdefg',
	is_normal: 'true'
};

describe('Storage', function () {
	this.slow(5000);

	after('terminate child process', function (done) {
		this.timeout(7000);

		storage.send({
			type: 'close'
		});

		setTimeout(function () {
			storage.kill('SIGKILL');
			done();
		}, 5000);
	});

	describe('#spawn', function () {
		it('should spawn a child process', function () {
			assert.ok(storage = cp.fork(process.cwd()), 'Child process not spawned.');
		});
	});

	describe('#handShake', function () {
		it('should notify the parent process when ready within 5 seconds', function (done) {
			this.timeout(5000);

			storage.on('message', function (message) {
				if (message.type === 'ready')
					done();
			});

			storage.send({
				type: 'ready',
				data: {
					options: {
						host: HOST,
						port: PORT,
						database: DATABASE,
						table: TABLE,
						user: USER,
						password: PASSWORD
					}
				}
			}, function (error) {
				assert.ifError(error);
			});
		});
	});

	describe('#data', function () {
		it('should process the data', function (done) {
			storage.send({
				type: 'data',
				data: record
			}, done);
		});
	});

	describe('#data', function () {
		it('should have inserted the data', function (done) {
			this.timeout(20000);

			var r = require('rethinkdb');

			var config = {
				host: HOST,
				port: PORT,
				db: DATABASE,
				user: USER,
				password: PASSWORD
			};

			r.connect(config, function (err, conn) {
				r.table(TABLE).filter(r.row('id').eq(ID)).run(conn, function (err, cursor) {
					if (err) throw err;
					cursor.toArray(function (err, result) {
						should.equal(record.co2, result[0].co2, 'Data validation failed. Field: co2');
						should.equal(record.is_normal, result[0].is_normal, 'Data validation failed. Field: is_normal');
						should.equal(record.quality, result[0].quality, 'Data validation failed. Field: quality');
						should.equal(record.random_data, result[0].random_data, 'Data validation failed. Field: random_data');
						should.equal(moment(record.reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'),
							moment(result[0].reading_time).format('YYYY-MM-DDTHH:mm:ss.SSSSZ'), 'Data validation failed. Field: reading_time');
						should.equal(record.temp, result[0].temp, 'Data validation failed. Field: temp');

						done();
					});
				});
			});
		});
	});

});