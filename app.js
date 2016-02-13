'use strict';

var platform = require('./platform'),
	r = require('rethinkdb'),
	tbl, connection;

/**
 * Emitted when device data is received. This is the event to listen to in order to get real-time data feed from the connected devices.
 * @param {object} data The data coming from the device represented as JSON Object.
 */
platform.on('data', function (data) {
	// TODO: Insert the data to the database using the initialized connection.

	r.table(tbl).insert(data).run(connection, function(err, res) {
		if (err) {
			console.error('Error inserting record on RethinkDB.', err);
			platform.handleException(err);
		} else {
			platform.log(JSON.stringify({
				title: 'Record Successfully inserted to RethinkDB.',
				data: data
			}));
		}
	});
});

/**
 * Emitted when the platform shuts down the plugin. The Storage should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function (error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		// TODO: Release all resources and close connections etc.
		platform.notifyClose(); // Notify the platform that resources have been released.
		d.exit();
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The options or configuration injected by the platform to the plugin.
 */
platform.once('ready', function (options) {


	var config = {
		host: options.host,
		port: options.port,
		db: options.database,
		auth_key: options.auth_key
	};
	tbl = options.table;

	r.connect(config, function(err, conn) {
		if (err) {
			console.error('Error connecting to RethinkDB.', err);
			platform.handleException(err);
		} else {
			connection = conn;
			platform.notifyReady();
			platform.log('RethinkDB Storage has been initialized.');
		}
	});


});