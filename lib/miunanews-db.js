var mongoose = require('mongoose');

var newsSchema = mongoose.Schema({
	nick: String,
	uid: String,
	msg: String,
	tid: String,
	url: String,
	avatar: String,
	type: String,
	created: Date
});

var News = mongoose.model('news', newsSchema);

exports.getOldNews = function(data, cb){
	var query = News.find({}).where('uid').ne(data.uid);
	query.sort('-_id').limit(parseInt(data.newslimit)).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.saveNews = function(data, cb){
	var newMsg = new News({nick: data.nick, uid: data.uid, msg: data.msg, tid: data.tid, url: data.url, avatar: data.avatar, type: data.type, created: data.created});
	News.find({}).count({}, function(err, docs){
		if (docs > parseInt(data.newslimit)*2) {
			News.find({}).sort('_id').findOneAndRemove().exec();
			newMsg.save(function(err, docs){cb(err, docs);});
		}
		else {
			newMsg.save(function(err, docs){cb(err, docs);});
		}
	});
};