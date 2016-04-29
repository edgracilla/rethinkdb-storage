'use strict';

var r             = require('rethinkdb'),
	isArray       = require('lodash.isarray'),
	platform      = require('./platform'),
	isPlainObject = require('lodash.isplainobject'),
	tableName, connection;

platform.on('data', function (data) {
	if (isPlainObject(data) || isArray(data)) {
		r.table(tableName).insert(data).run(connection, (insertError) => {
			if (insertError) {
				console.error('Error inserting record on RethinkDB.', insertError);
				platform.handleException(insertError);
			} else {
				platform.log(JSON.stringify({
					title: 'Record Successfully inserted to RethinkDB.',
					data: data
				}));
			}
		});
	}
	else
		platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${data}`));
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	var d = require('domain').create();

	d.once('error', function (error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		connection.close({
			noreplyWait: false
		}, (error) => {
			platform.handleException(error);
			platform.notifyClose();
			d.exit();
		});
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {
	tableName = options.table;

	r.connect({
		host: options.host,
		port: options.port,
		db: options.database,
		table: options.table,
		user: options.user,
		password: options.password
	}, (connectionError, conn) => {
		if (connectionError) {
			console.error('Error connecting to RethinkDB Database Server.', connectionError);
			platform.handleException(connectionError);

			return setTimeout(function () {
				process.exit(1);
			}, 2000);
		} else {
			connection = conn;
			platform.notifyReady();
			platform.log('RethinkDB Storage has been initialized.');
		}
	});
});