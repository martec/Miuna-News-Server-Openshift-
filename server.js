// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var cors = require('cors');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var auth = require('basic-auth');
var socketio = require('socket.io');
var db = require('./lib/miunanews-db');
var whitelist = [];
var urlap = require('url');

// initialize db, set up our express application================================

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
	ip = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
	url = process.env.url;

if (url) {
	mongoose.connect(url, {useMongoClient: true}); // connect to our database
	domain = urlap.parse(process.env.origin).hostname.replace("www.","");
	whitelist = 'http://'+domain+', https://'+domain+', http://www.'+domain+', https://www.'+domain+'';
	start();
}

function start() {
	var corsOptions = {
	  origin: function(origin, callback){
		var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
		callback(null, originIsWhitelisted);
	  }
	};

	app.use(cors(corsOptions), function(req, res, next) {
		next();
	});

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));

	// launch ======================================================================
	var server = app.listen(port, ip);
	var io = socketio.listen(server);
	var nsp = io.of('/mnews');

	// socket.io member ===========================================================

	nsp.on('connection', function(socket){
		socket.on('getoldnews', function(data){
			db.getOldNews(data, function(err, docs){
				socket.emit('loadoldnews', docs);
			});
		});
	});

	app.post('/newnews', function(req, res){
		if (process.env.name == auth(req).name) {
			if (process.env.pass == auth(req).pass) {
				data2 = req.body;
				res.send({sucess: 'sucess'});
				res.end();
				data2["created"] = Date.now();
				db.saveNews(data2, function(err, docs){});			
				nsp.emit('msgnews', data2);
				nsp.emit('newpostnews_'+data2.tid+'', data2);
			}
			else {
				res.send({error: 'admpassinc'});
				res.end();
			}
			
		} 
		else {
			res.send({error: 'admusarinc'});
			res.end();			
		}
	});

	app.post('/newmyalert', function(req, res){
		if (process.env.name == auth(req).name) {
			if (process.env.pass == auth(req).pass) {
				data2 = req.body;
				res.send({sucess: 'sucess'});
				res.end();
				data2["created"] = Date.now();		
				nsp.emit('myalertsnews_'+data2.uid+'', data2);
			}
			else {
				res.send({error: 'admpassinc'});
				res.end();
			}
		}
		else {
			res.send({error: 'admusarinc'});
			res.end();			
		}
	});
}
