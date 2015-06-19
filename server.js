// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var cors = require('cors');
var app = express();
var	port = process.env.OPENSHIFT_NODEJS_PORT;
var	ip = process.env.OPENSHIFT_NODEJS_IP;
var mongoose = require('mongoose');
var passport = require('passport');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var auth = require('basic-auth');
var User = require('./lib/user');
var db = require('./lib/miunanews-db');
var bcrypt = require('bcrypt-nodejs');
var whitelist = [];
var dbcredential = process.env.OPENSHIFT_MONGODB_DB_URL;
var dbname = 'miunanews';
var url = dbcredential + dbname;

// initialize db ===============================================================

mongoose.connect(url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application

User.findOne({'local.check': '1'}).exec(function(err, docs){
	if (docs) {
		whitelist = docs.local.origin;
	}
	start();
});

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

	app.set('view engine', 'ejs'); // set up ejs for templating

	// required for passport
	app.use(passport.initialize());

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

	//Routes ======================================================

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		req.logout();
		res.render('index.ejs'); // load the index.ejs file
	});

	app.get('/sucess', function(req, res) {
		req.logout();
		res.render('sucess.ejs'); // load the index.ejs file
	});

	// =====================================
	// Settings ============================
	// =====================================
	// show the settings form
	app.get('/settings', function(req, res) {

		// check if already configured, if not will go to signup page
		User.find({}).count({}, function(err, docs){
			if (docs==0) {
				res.render('settings.ejs');
			}
			else {
				res.redirect('/sucess');
			}
		});
	});

	// process the settings form
	app.post('/settings', passport.authenticate('local-signup', {
		session: false,
		successRedirect : '/sucess', // redirect to the secure profile section
		failureRedirect : '/settings' // redirect back to the signup page if there is an error
	}));

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	app.post('/newnews', function(req, res){
		User.findOne({ 'local.user' : auth(req).name }, function(err, data) {
			if (data) {
				if (bcrypt.compareSync(auth(req).pass, data.local.password)) {
					data2 = req.body;
					data2["created"] = Date.now();
					db.saveNews(data2, function(err, docs){});			
					nsp.emit('msgnews', data2);
					nsp.emit('newpostnews_'+data2.tid+'', data2);
					res.send({sucess: 'sucess'});
					res.end();
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
	});

	app.post('/newmyalert', function(req, res){
		User.findOne({ 'local.user' : auth(req).name }, function(err, data) {
			if (data) {
				if (bcrypt.compareSync(auth(req).pass, data.local.password)) {
					data2 = req.body;
					data2["created"] = Date.now();		
					nsp.emit('myalertsnews_'+data2.uid+'', data2);
					res.send({sucess: 'sucess'});
					res.end();
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
	});
}