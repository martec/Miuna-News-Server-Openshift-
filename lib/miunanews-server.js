var origin = 'www.bf4brasil.com.br:80';

var socketio = require('socket.io');
var db = require('./miunanews-db');
var io;

exports.listen = function(server){
	io = socketio(server);
	io.set('origins', origin);
	io.sockets.on('connection', function(socket){
		socket.on('getoldnews', function(data){
			db.getOldNews(data, function(err, docs){
				socket.emit('loadoldnews', docs);
			});
		});
		socket.on('msgnews', function(data){
			data["created"] = Date.now();
			db.saveNews(data, function(err, docs){});
			io.emit('msgnews', data);
			io.emit('newpostnews_'+data.tid+'', data);
		});
		socket.on('myalertsnews', function(data){
			data["created"] = Date.now();		
			io.emit('myalertsnews_'+data.uid+'', data);
		});
	});
}
