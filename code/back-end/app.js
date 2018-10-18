
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
			if (data.cur != data.type) {
				socket.emit("sessionFailed");
				return;
			}
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
			var admin_cursor = dbase.collection("admin").find({ "admin_id": data.username });
			admin_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				socket.emit("adminInfo", doc[0]);
			});
		});

		socket.on("updateAdminInfo", function (data) {
			dbase.collection("admin").updateOne({ "admin_id": data.admin_id }, { $set: { "phone": data.phone, "email": data.email } });
			socket.emit("updateAdminInfoSuccess");
		});

		socket.on("updateAdminPassword", function (data) {
			dbase.collection("accounts").updateOne({ "username": data.username }, { $set: { "password": data.password } });
			socket.emit("updateAdminPasswordSuccess");
		});

		//about librarian
		socket.on("getLibrarianInfo", function (data) {
			var cursor = dbase.collection("librarian").find({ "librarian_id": data.username });
			cursor.toArray(function (err, doc) {
				test.equal(null, err);
				socket.emit("librarianInfo", doc[0]);
			});
		});

		socket.on("updateLibrarianInfo", function (data) {
			dbase.collection("librarian").updateOne({ "librarian_id": data.librarian_id }, { $set: { "phone": data.phone, "email": data.email } });
			socket.emit("updateLibrarianInfoSuccess");
		});

		socket.on("updateLibrarianPassword", function (data) {
			dbase.collection("accounts").updateOne({ "username": data.username }, { $set: { "password": data.password } });
			socket.emit("updateLibrarianPasswordSuccess");
		});

		socket.on("addLibrarianRole", function (data) {
			var addresult = {};
			dbase.collection("globalVar").find({ "var_name": "librarian" }).toArray(function (err, doc) {
				var cur = doc[0].librarian;
				dbase.collection("globalVar").updateOne({ "var_name": "librarian" }, { $set: { "librarian": cur + 1 } });
				data.librarian_id = "L" + cur.toString();
				dbase.collection("librarian").insertOne(data, function (err, res) {
					addresult.librarian_id = data.librarian_id;
					socket.emit("addLibrarianRoleSuccess", addresult);
					var auth_data = {};
					auth_data.username = data.librarian_id;
					auth_data.password = "123456";
					auth_data.type = "librarian";
					dbase.collection("accounts").insertOne(auth_data);
				});
			});
		});

		socket.on("addReaderRole", function (data) {
			var addresult = {};
			data.reader_id = data.phone;
			dbase.collection("reader").insertOne(data, function (err, res) {
				addresult.reader_id = data.reader_id;
				socket.emit("addReaderRoleSuccess", addresult);
				var auth_data = {};
				auth_data.username = data.reader_id;
				auth_data.password = "12345678";
				auth_data.type = "reader";
				dbase.collection("accounts").insertOne(auth_data);
			});
		});

		socket.on("printBarcode", function (data) {
			dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, doc) {
				if (doc.length == 0) {
					data.available_number = data.total_number;
					dbase.collection("books").insertOne(data, function () {
						var barcode_list = [];
						var cur = 0;
						dbase.collection("globalVar").find({ "var_name": "bar_code" }).toArray(function (err, doc) {
							cur = doc[0].bar_code;
							dbase.collection("globalVar").updateOne({ "var_name": "bar_code" }, { $set: { "bar_code": cur + data.total_number } });
							var copy_datas = [];
							for (var i = 0; i < data.total_number; i++) {
								var copy_data = {};
								copy_data.status = "available";
								copy_data.isbn = data.isbn;
								copy_data.bar_code = cur + i;
								barcode_list.push(cur + i);
								copy_datas.push(copy_data);
							}
							dbase.collection("copies").insertMany(copy_datas);
							socket.emit("barcodeList", { "barcode_list": barcode_list });
						});
					});
				} else {
					dbase.collection("books").updateOne({ "isbn": data.isbn }, { $set: { "total_number": doc[0].total_number + data.total_number } });
					var barcode_list = [];
					var cur = 0;
					dbase.collection("globalVar").find({ "var_name": "bar_code" }).toArray(function (err, doc) {
						cur = doc[0].bar_code;
						dbase.collection("globalVar").updateOne({ "var_name": "bar_code" }, { $set: { "bar_code": cur + data.total_number } });
						var copy_datas = [];
						for (var i = 0; i < data.total_number; i++) {
							var copy_data = {};
							copy_data.status = "available";
							copy_data.isbn = data.isbn;
							copy_data.bar_code = cur + i;
							barcode_list.push(cur + i);
							copy_datas.push(copy_data);
						}
						dbase.collection("copies").insertMany(copy_datas);
						socket.emit("barcodeList", { "barcode_list": barcode_list });
					});
				}
			});



		});

		socket.on("getLibrarianList", function (data) {
			dbase.collection("librarian").find().toArray(function (err, doc) {
				var data = {};
				data.librarian_list = doc;
				socket.emit("librarianList", data);
			});
		});

		socket.on("deleteLibrarian", function (data) {
			dbase.collection("librarian").deleteOne({ "librarian_id": data.librarian_id }, function (err, res) {
				test.equal(null, err);
				socket.emit("deleteLibrarianSuccess");
			});
			dbase.collection("accounts").deleteOne({ "username": data.librarian_id });
		});

		socket.on("editLibrarianRole", function (data) {
			dbase.collection("librarian").updateOne({ "librarian_id": data.librarian_id }, { $set: { "name": data.name, "gender": data.gender, "phone": data.phone, "email": data.email } }, function (err, res) {
				test.equal(null, err);
				socket.emit("editLibrarianSuccess");
			});
		});

		socket.on("getReaderList", function (data) {
			dbase.collection("reader").find().toArray(function (err, doc) {
				var data = {};
				data.reader_list = doc;
				socket.emit("readerList", data);
			});
		});



		socket.on("deleteReader", function (data) {
			dbase.collection("reader").remove({ "reader_id": data.reader_id }, function (err, res) {
				test.equal(null, err);
				socket.emit("deleteReaderSuccess");
			});
			dbase.collection("accounts").deleteOne({ "username": data.reader_id });
		});

		socket.on("editReaderRole", function (data) {
			dbase.collection("reader").updateOne({ "reader_id": data.reader_id }, { $set: { "name": data.name, "gender": data.gender, "phone": data.phone, "email": data.email } }, function (err, res) {
				test.equal(null, err);
				socket.emit("editReaderSuccess");
			});
		});
		/////////////jc
		socket.on('getReaderInfo', function (data) {
			var cursor = dbase.collection("reader").find({ "reader_id": data.username });
			cursor.toArray(function (err, doc) {
				test.equal(null, err);
				socket.emit("readerInfo", doc[0]);
			});
		});

		socket.on("updateReaderInfo", function (data) {
			dbase.collection("reader").updateOne({ "reader_id": data.reader_id }, { $set: { "phone": data.phone, "email": data.email } });
			socket.emit("updateReaderInfoSuccess");
		});

		socket.on("getBookList", function (data) {
			dbase.collection("books").find({})
				.toArray(function (err, doc) {
					test.equal(null, err);
					var bookList = {};
					for (var i = 0; i < doc.length; i++) {
						delete doc[i].figure;
					}
					bookList.bookList = doc;
					socket.emit("bookList", bookList);
				});
		});

		socket.on("getBookDetail", function (data) {
			dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, res) {
				test.equal(null, err);
				var book = {};
				book.bookDetail = res[0];
				socket.emit("bookDetail", book);
			});
		});

		socket.on('searchBooks', function (data) {
			var whereStr = {};
			if (data.book_name != '') whereStr['book_name'] = data.book_name;
			if (data.author != '') whereStr['author'] = data.author;
			if (data.press != '') whereStr['press'] = data.press;
			if (data.publish_year != '') whereStr['publish_year'] = data.publish_year;
			if (data.type != '') whereStr['type'] = data.type;

			console.log(data.book_name + ' ' + data.author + " " + data.press + " " + data.publish_year + " " + data.type);
			if (data.show_avail == true) whereStr['available_number'] = { $gt: 0 };
			var search_books_cursor = dbase.collection("books").find(whereStr);
			search_books_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				var result = {};
				for (var i = 0; i < doc.length; i++) {
					delete doc[i].figure;
				}
				result.bookList = doc;
				socket.emit('searchBooksResult', result);
			});
		});

		socket.on("editBook", function (data) {
			dbase.collection("books").updateOne({ "isbn": data.origin }, { $set: { "book_name": data.book_name, "price": data.price, "author": data.author, "isbn": data.isbn, "press": data.press, "publish_year": data.publish_year, "subject": data.subject, "page": data.page, "type": data.type, "total_number": data.total_number, "location": data.location, "figure": data.figure } });
			dbase.collection("copies").updateOne({ "isbn": data.origin }, { $set: { "isbn": data.isbn } });
			socket.emit("editBookSuccess");
		});

		socket.on("getCopyList", function (data) {
			dbase.collection("copies").find({ "isbn": data.isbn }).toArray(function (err, res) {
				test.equal(null, err);
				var copy_list = {};
				copy_list.copy_list = res;
				socket.emit("copyList", copy_list);
			});
		});

		socket.on("deleteCopy", function (data) {
			var deleted = false;
			dbase.collection("copies").deleteOne({ "bar_code": data.bar_code });
			data.time = new Date();
			dbase.collection("librarianOperation").insertOne(data);
			dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, res) {
				test.equal(null, err);
				if (res[0].total_number == 1) {
					dbase.collection("books").deleteOne({ "isbn": data.isbn });
					deleted = true;
				} else {
					dbase.collection("books").updateOne({ "isbn": data.isbn }, { $set: { "available_number": res[0].available_number - 1, "total_number": res[0].total_number - 1 } });
				}
				var succ = {};
				succ.deleted = deleted;
				socket.emit("deleteCopySuccess", succ);
			});
		});

		socket.on("deleteBook", function (data) {
			dbase.collection("copies").deleteMany({ "isbn": data.isbn });
			dbase.collection("books").deleteOne({ "isbn": data.isbn });
			data.bar_code = 0;
			dbase.collection("librarianOperation").insertOne(data);
			socket.emit("deleteBookSuccess");
		});

		socket.on("getLibrarianRecord", function (data) {
			dbase.collection("librarianOperation").find({ "isbn": data.isbn }).sort({ "time": -1 }).toArray(function (err, res) {
				test.equal(null, err);
				var record = {};
				record.record = res;
				socket.emit("librarianRecord", record);
			});
		});




		//The scope which all bussiness defined in. end--------------------------------------------------------------
	});
});
