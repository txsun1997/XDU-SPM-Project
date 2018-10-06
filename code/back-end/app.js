
function randomString(len) {
	len = len || 32;
	var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
	var maxPos = $chars.length;
	var pwd = '';
	for (i = 0; i < len; i++) {
		pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
	}
	return pwd;
}

//Mongodb package is introduced to support data store.
var MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017";
var dbase;

//Socket.io package is introduced to support socket communication.
var io = require('socket.io')(2761);

//Assert package is introduced to handle error.
var test = require('assert');

//Let's connect to our Mongodb database.
MongoClient.connect(url, { 'useNewUrlParser': true }, function (err, db) {
	test.equal(null, err);

	//Use database Bibliosoft.
	dbase = db.db("Bibliosoft");
	console.log("Required database has been successfully accessed.");

	//connect server when client start to run, all things need to be completed are defined in this scope.
	io.on('connection', function (socket) {
		console.log("The client and server has been successfully connected.");
		//The scope which all bussiness defined in. start------------------------------------------------------------

		//author: wanglei, usage: login part for user.
		socket.on('login', function (data) {
			//Do the things you want to do when a user login.
			var auth_cursor = dbase.collection("accounts").find({ "username": data.username });
			auth_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				var successData = {};
				if (doc.length == 0) {
					socket.emit("noUser");
				} else {
					if (doc[0].password == data.password) {
						successData.type = doc[0].type;
						successData.session = randomString(32);
						socket.emit("LoginSuccess", successData);
						successData.username = doc[0].username;
						dbase.collection("session").insertOne(successData);
					} else {
						socket.emit("wrongPassword");
					}
				}
			});
		});

		//if this session exits?
		socket.on('sessionAuth', function (data) {
			var auth_cursor = dbase.collection("session").find({ "session": data.session });
			auth_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length == 0) {
					socket.emit("noSession");
				} else {
					if (doc[0].username == data.username && doc[0].type == data.type) {
						socket.emit("sessionSuccess");
					} else {
						socket.emit("sessionFailed");
					}
				}
			});
		});

		//logout
		socket.on('logOut', function (data) {
			dbase.collection("session").deleteOne({ "session": data.session });
		});

		//about admin
		socket.on("getAdminInfo", function (data) {
			var auth_cursor = dbase.collection("session").find({ "session": data.session });
			auth_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				if (doc[0].username == data.username && doc[0].type == data.type) {
					var admin_cursor = dbase.collection("admin").find({ "username": data.username });
					admin_cursor.toArray(function (err, doc) {
						test.equal(null, err);
						socket.emit("adminInfo", doc[0]);
					});
				}
			});
		});

		socket.on("updateAdminInfo", function (data) {
			dbase.collection("admin").updateOne({ "username": data.username }, { $set: { "phone": data.phone, "email": data.email } });
			socket.emit("updateAdminInfoSuccess");
		});

		socket.on("updateAdminPassword", function (data) {
			dbase.collection("accounts").updateOne({ "username": data.username }, { $set: { "password": data.password } });
			socket.emit("updateAdminPasswordSuccess");
		});

		//about librarian
		socket.on("getLibrarianInfo", function (data) {
			var auth_cursor = dbase.collection("session").find({ "session": data.session });
			auth_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				if (doc[0].username == data.username && doc[0].type == data.type) {
					var cursor = dbase.collection("librarian").find({ "username": data.username });
					cursor.toArray(function (err, doc) {
						test.equal(null, err);
						socket.emit("librarianInfo", doc[0]);
					});
				}
			});
		});

		socket.on("updateLibrarianInfo", function (data) {
			dbase.collection("librarian").updateOne({ "username": data.username }, { $set: { "phone": data.phone, "email": data.email } });
			socket.emit("updateLibrarianInfoSuccess");
		});

		socket.on("updateLibrarianPassword", function (data) {
			dbase.collection("accounts").updateOne({ "username": data.username }, { $set: { "password": data.password } });
			socket.emit("updateLibrarianPasswordSuccess");
		});

		socket.on("addLibrarianRole", function (data) {
			dbase.collection("librarian").insertOne(data, function (err, res) {
				dbase.collection("librarian").updateOne({ "_id": res.insertedId }, { $set: { "username": res.insertedId } });
				socket.emit("addLibrarianRoleSuccess");
				var auth_data = {};
				auth_data.username = res.insertedId;
				auth_data.password = "123456";
				auth_data.type = "librarian";
				dbase.collection("accounts").insertOne(auth_data);
			});
		});

		socket.on("addReaderRole", function (data) {
			dbase.collection("reader").insertOne(data, function (err, res) {
				dbase.collection("reader").updateOne({ "_id": res.insertedId }, { $set: { "username": res.insertedId } });
				socket.emit("addReaderRoleSuccess");
				var auth_data = {};
				auth_data.username = res.insertedId;
				auth_data.password = "123456";
				auth_data.type = "reader";
				dbase.collection("accounts").insertOne(auth_data);
			});
		});
		/*
				socket.on("editLibrarianRole",function(data){
					dbase.collection("librarian").updateOne(data, function(res){
						socket.emit("addLibrarianRoleSuccess");
						var auth_data = {};
						auth_data.username = res.insertedId;
						auth_data.password = "123456";
						auth_data.type = "librarian";
						dbase.collection("accounts").insertOne(auth_data);
					});
				}); 
		*/

		//The scope which all bussiness defined in. end--------------------------------------------------------------
	});

});
