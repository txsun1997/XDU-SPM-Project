
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

//request-json package is introduced to support get json object from specified url
var request = require('request-json');
var api_url = "https://api.douban.com/v2/book/isbn/:";

//Assert package is introduced to handle error.
var test = require('assert');

//Let's connect to our Mongodb database.
MongoClient.connect(url, { 'useNewUrlParser': true }, function (err, db) {
	test.equal(null, err);

	//Use database Bibliosoft.
	dbase = db.db("Bibliosoft");
	console.log("Required database has been successfully accessed.");

	function checkAndUpdate(res, i, length) {
		if (i == length) return 0;
		var index = 0;
		var p1 = dbase.collection('reserve').updateOne({ bar_code: res[i].bar_code, status: true }, { $set: { status: false } });
		var p2 = p1.then(dbase.collection('books').find({ isbn: res[i].isbn }).toArray(function (err1, res1) {
			test.equal(null, err1);
			if (res1.length == 0) return;
			var p3 = dbase.collection('books').updateOne({ isbn: res[i].isbn }, { $set: { available_number: res1[0].available_number + 1 } });
			var p4 = p3.then(dbase.collection('copies').updateOne({ bar_code: res[i].bar_code }, { $set: { status: "available" } }));
			var p5 = p4.then(dbase.collection('reader').find({ reader_id: res[i].reader_id }).toArray(function (err2, res2) {
				test.equal(null, err2);
				if (res2.length == 0) return;
				var p6 = dbase.collection('reader').updateOne({ reader_id: res[i].reader_id }, { $set: { borrowNum: res2[0].borrowNum - 1 } });
				p6.then(checkAndUpdate(res, i + 1, length));
			}));
		}));
	}

	setInterval(function () {
		var cur_time = new Date();
		var ms_time = cur_time.getTime();
		dbase.collection('config').find({ varname: 'config' }).toArray(function (err0, doc0) {
			test.equal(null, err0);
			var reserve = doc0[0].reserve;
			dbase.collection('reserve').find({ status: true, reserve_time: { $lt: ms_time - 60000 * reserve * 60 } }).toArray(function (err, res) {
				test.equal(null, err);
				if (res.length == 0) return;
				checkAndUpdate(res, 0, res.length);
			});
		});
	}, 60000);



	var email = require("emailjs");
	var server = email.server.connect({
		user: "cjiang_5@stu.xidian.edu.cn",      // 你的QQ用户
		password: "m@",           // 注意，不是QQ密码，而是刚才生成的授权码
		host: "stumail.xidian.edu.cn",         // 主机，不改
		ssl: false                 // 使用ssl
	});

	//connect server when client start to run, all things need to be completed are defined in this scope.
	io.on('connection', function (socket) {
		console.log("The client and server has been successfully connected.");
		//The scope which all bussiness defined in. start------------------------------------------------------------


		// 导入node-schedule模块
		var schedule = require("node-schedule");

		// 设置每天8点检查逾期信息
		var rule = new schedule.RecurrenceRule();
		rule.dayOfWeek = [0, new schedule.Range(1, 6)];
		rule.hour = 8;
		rule.minute = 0;

		var j = schedule.scheduleJob(rule, function () {
			dbase.collection('config').find({ varname: 'config' }).toArray(function (err0, doc0) {
				var limit = doc0[0].limit;
				var cur_time = new Date();
				var ms_time = cur_time.getTime();
				dbase.collection('borrows').find({ status: true }).toArray(function (err1, doc1) {
					for (var i = 0; i < doc1.length; i++) {
						borrow_time = doc1[i].borrow_date.getTime();
						// 如果当前时间减去租借时间大于限定时间，则发送警告邮件
						if (ms_time - borrow_time > limit * 24 * 60 * 60 * 1000) {
							var email_data = {};
							email_data.book_name = doc1[i].book_name;
							dbase.collection('reader').find({ "reader_id": doc1[i].reader_id }).toArray(function (err2, doc2) {
								email_data.email = doc2[0].email;
								server.send({
									text: "The book " + email_data.book_name + " has overdued. Please return your book, or you will be fined 1 cent per day.",       //邮件内容
									from: "cjiang_5@stu.xidian.edu.cn",        //谁发送的
									to: email_data.email,       //发送给谁的
									subject: "receiveAlert"          //邮件主题
								}, function (err, message) {
									console.log(err || message);
								});
							});
						}
					}
				});
			});
		});

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

		socket.on('loginForLibrarian', function (data) {
			//Do the things you want to do when a user login.
			var auth_cursor = dbase.collection("accounts").find({ "username": data.username, "type": "librarian" });
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

		socket.on('loginForAdmin', function (data) {
			//Do the things you want to do when a user login.
			var auth_cursor = dbase.collection("accounts").find({ "username": data.username, "type": "admin" });
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
						socket.emit("sessionSuccess", data.req);
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
					auth_data.password = "00010001";
					auth_data.type = "librarian";
					dbase.collection("accounts").insertOne(auth_data);
				});
			});
		});

		socket.on("getLibrarianDetail", function (data) {
			dbase.collection("librarian").find({ "librarian_id": data.librarian_id }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length != 0) {
					var data = {};
					data.data = doc[0];
					socket.emit("librarianDetail", doc[0]);
				}
			});
		});

		socket.on("addReaderRole", function (data) {
			dbase.collection("reader").find({ "reader_id": data.phone }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length != 0) {
					socket.emit("repeatID");
					return;
				}
				var addresult = {};
				data.reader_id = data.phone;
				data.borrowNum = 0;
				dbase.collection("reader").insertOne(data, function (err, res) {
					test.equal(null, err);
					addresult.reader_id = data.reader_id;
					socket.emit("addReaderRoleSuccess", addresult);
					var auth_data = {};
					auth_data.username = data.reader_id;
					auth_data.password = "12345678";
					auth_data.type = "reader";
					dbase.collection("accounts").insertOne(auth_data);
					dbase.collection("config").find({ "varname": "config" }).toArray(function (err, doc1) {
						var auth_data1 = {};
						auth_data1.date = new Date();
						auth_data1.type = "deposit";
						auth_data1.value = doc1[0].security;
						auth_data1.reader_id = data.reader_id;
						dbase.collection("income").insertOne(auth_data1);
					});
				});
			});
		});

		socket.on("printBarcode", function (data) {
			dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, doc) {
				if (doc.length == 0) {
					var insertBook = {};
					insertBook = data;
					data.available_number = data.total_number;
					var location = data.location;
					insertBook.available_number = data.total_number;
					delete insertBook.location;
					if (data.isbn == "N") {
						dbase.collection("globalVar").find({ "var_name": "isbn" }).toArray(function (err, doc) {
							var cur_isbn = doc[0].isbn;
							dbase.collection("globalVar").updateOne({ "var_name": "isbn" }, { $set: { "isbn": cur_isbn + 1 } });
							data.isbn = "H" + cur_isbn.toString();
							dbase.collection("books").insertOne(insertBook, function () {
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
										copy_data.location = location;
										barcode_list.push(cur + i);
										copy_datas.push(copy_data);
									}
									dbase.collection("copies").insertMany(copy_datas);
									socket.emit("barcodeList", { "barcode_list": barcode_list });
									socket.emit("addBookSuccess");
								});
							});
						});
					} else {
						dbase.collection("books").insertOne(insertBook, function () {
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
									copy_data.location = location;
									barcode_list.push(cur + i);
									copy_datas.push(copy_data);
								}
								dbase.collection("copies").insertMany(copy_datas);
								socket.emit("barcodeList", { "barcode_list": barcode_list });
								socket.emit("addBookSuccess");
							});
						});
					}
				} else {
					socket.emit("existed");
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

		socket.on("getRuleInfo", function () {
			dbase.collection("config").find({ "varname": "config" }).toArray(function (err, doc) {
				socket.emit("ruleInfo", doc[0]);
			});
		});

		socket.on("getReaderList", function (data) {
			dbase.collection("reader").find().toArray(function (err, doc) {
				var data = {};
				data.reader_list = doc;
				socket.emit("readerList", data);
			});
		});

		socket.on("editReaderRole", function (data) {
			dbase.collection("reader").updateOne({ "reader_id": data.reader_id }, { $set: { "name": data.name, "gender": data.gender, "phone": data.phone, "email": data.email } }, function (err, res) {
				test.equal(null, err);
				socket.emit("editReaderSuccess");
			});
		});

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
						delete doc[i].subject;
						delete doc[i].location;
						delete doc[i].page;
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
			orStr = [];
			orStr.push({ book_name: new RegExp('.*' + data + '.*', 'i') });
			//orStr.push({book_name:'/'+data+'/'});
			orStr.push({ author: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ press: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ publish_year: data });
			orStr.push({ type: data });
			whereStr = { $or: orStr };
			var search_books_cursor = dbase.collection("books").find(whereStr);
			search_books_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				for (var i = 0; i < doc.length; i++) {
					delete doc[i].figure;
					delete doc[i].subject;
					delete doc[i].location;
					delete doc[i].page;
				}
				var bookList = {};
				bookList.bookList = doc;
				socket.emit('bookList', bookList);
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
				for (var i = 0; i < copy_list.copy_list.length; i++) {
					if (copy_list.copy_list[i].status == "borrowed") {

					}
				}
				socket.emit("copyList", copy_list);
			});
		});

		socket.on("deleteCopy", function (data) {
			dbase.collection("copies").find({ "bar_code": data.bar_code }).toArray(function (err, auth) {
				if (auth[0].status != "available") {
					socket.emit("copyNotAvailable");
					return;
				}
				dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, doc) {
					test.equal(null, err);
					data.book_name = doc[0].book_name;
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
			});
		});

		socket.on("deleteBook", function (data) {
			dbase.collection("copies").find({ "isbn": data.isbn }).toArray(function (err, auth) {
				for (var i = 0; i < auth.length; i++) {
					if (auth[i].status != "available") {
						socket.emit("bookNotAvailable");
						return;
					}
				}
				dbase.collection("copies").deleteMany({ "isbn": data.isbn });
				data.bar_code = 0;
				dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, doc) {
					test.equal(null, err);
					data.book_name = doc[0].book_name;
					data.time = new Date();
					dbase.collection("librarianOperation").insertOne(data);
					dbase.collection("books").deleteOne({ "isbn": data.isbn });
					socket.emit("deleteBookSuccess");
				});
			});
		});

		socket.on("deleteReader", function (data) {
			dbase.collection("borrows").find({ "reader_id": data.reader_id }).toArray(function (err, doc) {
				for (var i = 0; i < doc.length; i++) {
					if (doc[i].status == false) {
						socket.emit("notAllReturned");
						return;
					}
				}
				dbase.collection("reader").deleteOne({ "reader_id": data.reader_id }, function (err, res) {
					test.equal(null, err);
					socket.emit("deleteReaderSuccess");
				});
				dbase.collection("accounts").deleteOne({ "username": data.reader_id });
				var auth_data1 = {};
				auth_data1.date = new Date();
				auth_data1.type = "deposit";
				auth_data1.value = -300;
				auth_data1.reader_id = data.reader_id;
				dbase.collection("income").insertOne(auth_data1);
			});
		});

		socket.on("getLibrarianRecord", function () {
			dbase.collection("librarianOperation").find().sort({ "time": -1 }).toArray(function (err, res) {
				test.equal(null, err);
				var record = {};
				record.record = res;
				for (var i = 0; i < res.length; i++) {
					res[i].book_name;
				}
				socket.emit("librarianRecord", record);
			});
		});

		socket.on("getBookInformation", function (data) {
			dbase.collection("copies").find({ "bar_code": data.bar_code }).toArray(function (err, res) {
				test.equal(null, err);
				if (res.length == 0) return;
				dbase.collection("books").find({ "isbn": res[0].isbn }).toArray(function (err, res) {
					test.equal(null, err);
					if (res.length == 0) return;
					var book_info = {};
					book_info.bar_code = data.bar_code;
					book_info.book_name = res[0].book_name;
					book_info.author = res[0].author;
					book_info.isbn = res[0].isbn;
					book_info.press = res[0].press;
					var push = {};
					push.book_info = book_info;
					socket.emit("bookInformation", push);
					dbase.collection("borrows").find({ "bar_code": data.bar_code, "status": false }).toArray(function (err, res) {
						test.equal(null, err);
						if (res.length != 0) {
							dbase.collection("config").find({ "varname": "config" }).toArray(function (err, res2) {
								var cur = new Date();
								var interval = cur.getTime() - res[0].borrow_date.getTime();
								if (interval > res2[0].limit * 86400000) {
									var fine = (interval / 86400000 - res2[0].limit) * res2[0].exceed;
								} else {
									var fine = 0;
								}
								var reader_info = {};
								reader_info.reader_id = res[0].reader_id;
								dbase.collection("reader").find({ "reader_id": reader_info.reader_id }).toArray(function (err, res) {
									test.equal(null, err);
									if (res.length != 0) {
										reader_info.fine = fine;
										reader_info.name = res[0].name;
										socket.emit("readerInfoForReturn", reader_info);
									}
								});
							});
						}
					});
				});
			});
		});
		socket.on("getBorrowerInformation", function (data) {
			dbase.collection("reader").find({ "reader_id": data.phone }).toArray(function (err, res) {
				test.equal(null, err);
				if (res.length == 0) return;
				push = {};
				push.name = res[0].name;
				socket.emit("borrowerInformation", push);
			});
		});


		socket.on("borrowBook", function (data) {
			dbase.collection("config").find({ "varname": "config" }).toArray(function (err, config) {
				test.equal(null, err);
				var cur_time = new Date();
				var ms_time = cur_time.getTime();
				dbase.collection('reserve').updateMany({ reader_id: data.phone, status: true, reserve_time: { $lt: ms_time - config[0].reserve * 60 * 60000 } }, { $set: { 'status': false } }, function (err, sync) {
					test.equal(null, err);
					dbase.collection("copies").find({ "bar_code": data.bar_code }).toArray(function (err, copies) {
						test.equal(null, err);
						if (copies.length == 0) {
							socket.emit("copyNotExist");
							return;
						}
						dbase.collection("reserve").find({ "reader_id": data.phone, "bar_code": data.bar_code, "status": true }).toArray(function (err, reserve) {
							if (reserve.length == 0) {
								if (copies[0].status == "borrowed" || copies[0].status == "reserved") {
									socket.emit("notAvailable");
									return;
								}
								dbase.collection("books").find({ "isbn": copies[0].isbn }).toArray(function (err, books) {
									test.equal(null, err);
									if (books[0].available_number == 0) {
										socket.emit("allBorrows");
										return;
									}
									dbase.collection("reader").find({ "reader_id": data.phone }).toArray(function (err, reader) {
										test.equal(null, err);
										if (reader.length == 0) {
											socket.emit("readerNotExist");
											return;
										}
										if (reader[0].borrowNum >= config[0].maxnum) {
											socket.emit("limitExceed");
											return;
										}
										dbase.collection("books").updateOne({ "isbn": copies[0].isbn }, { $set: { "available_number": books[0].available_number - 1 } });
										dbase.collection("reader").updateOne({ "reader_id": data.phone }, { $set: { "borrowNum": reader[0].borrowNum + 1 } });
										dbase.collection("copies").updateOne({ "bar_code": data.bar_code }, { $set: { "status": "borrowed" } });
										dbase.collection("copies").find({ "bar_code": data.bar_code }).toArray(function (err, res1) {
											dbase.collection("books").find({ "isbn": res1[0].isbn }).toArray(function (err, res2) {
												var insert_data = {};
												insert_data.book_name = res2[0].book_name;
												insert_data.reader_id = data.phone;
												insert_data.bar_code = data.bar_code;
												insert_data.lend_librarian_id = data.lend_librarian_id;
												insert_data.return_librarian_id = "-";
												insert_data.borrow_date = new Date();
												insert_data.return_date = "-";
												insert_data.status = false;
												insert_data.fine = 0;
												insert_data.isbn = res2[0].isbn;
												dbase.collection("borrows").insertOne(insert_data);
												socket.emit("borrowSuccess");
											});
										});
									});
								});
							} else {
								dbase.collection("reserve").updateOne({ "bar_code": data.bar_code, "reader_id": data.phone, "status": true }, { $set: { "status": false } });
								dbase.collection("copies").updateOne({ "bar_code": data.bar_code }, { $set: { "status": "borrowed" } });
								dbase.collection("copies").find({ "bar_code": data.bar_code }).toArray(function (err, res1) {
									dbase.collection("books").find({ "isbn": res1[0].isbn }).toArray(function (err, res2) {
										var insert_data = {};
										insert_data.book_name = res2[0].book_name;
										insert_data.reader_id = data.phone;
										insert_data.bar_code = data.bar_code;
										insert_data.lend_librarian_id = data.lend_librarian_id;
										insert_data.return_librarian_id = "-";
										insert_data.borrow_date = new Date();
										insert_data.return_date = "-";
										insert_data.status = false;
										insert_data.fine = 0;
										insert_data.isbn = res2[0].isbn;
										dbase.collection("borrows").insertOne(insert_data);
										socket.emit("borrowSuccess");
									});
								});
							}
						});
					});
				});
			});
		});


		socket.on("returnBook", function (data) {
			dbase.collection("borrows").find({ "reader_id": data.phone, "bar_code": data.bar_code, "status": false }).toArray(function (err, res) {
				test.equal(null, err);
				if (res.length == 0) {
					socket.emit("noRecord");
					return;
				}
				dbase.collection("config").find({ "varname": "config" }).toArray(function (err, res2) {
					dbase.collection("copies").find({ "bar_code": data.bar_code }).toArray(function (err, copies) {
						test.equal(null, err);
						dbase.collection("books").find({ "isbn": copies[0].isbn }).toArray(function (err, books) {
							test.equal(null, err);
							dbase.collection("books").updateOne({ "isbn": books[0].isbn }, { $set: { "available_number": books[0].available_number + 1 } });
						});
					});

					dbase.collection("reader").find({ "reader_id": data.phone }).toArray(function (err, reader) {
						test.equal(null, err);
						dbase.collection("reader").updateOne({ "reader_id": data.phone }, { $set: { "borrowNum": reader[0].borrowNum - 1 } });

					});

					dbase.collection("copies").updateOne({ "bar_code": data.bar_code }, { $set: { "status": "available" } });

					var cur = new Date();
					var interval = cur.getTime() - res[0].borrow_date.getTime();
					if (interval > res2[0].limit * 86400000) {
						var fine = (interval / 86400000 - res2[0].limit) * res2[0].exceed;
						var auth_data1 = {};
						auth_data1.date = new Date();
						auth_data1.type = "fine";
						auth_data1.value = fine;
						auth_data1.reader_id = data.phone;
						dbase.collection("income").insertOne(auth_data1);
					} else {
						var fine = 0;
					}
					dbase.collection("borrows").updateOne({ "reader_id": data.phone, "bar_code": data.bar_code, "status": false }, { $set: { "status": true, "return_librarian_id": data.return_librarian_id, "return_date": cur, "fine": fine } });
					socket.emit("returnBookSuccess");
				});
			});
		});


		socket.on("getBorrowRecord", function (data) {
			dbase.collection("borrows").find({ "reader_id": data.reader_id }).sort({ "borrow_date": -1 }).toArray(function (err, reader) {
				test.equal(null, err);
				if (reader.length == 0) return;
				dbase.collection("config").find({ "varname": "config" }).toArray(function (err, res) {
					var cur = new Date();
					for (var i = 0; i < reader.length; i++) {
						if (reader[i].status == false) {
							var interval = cur.getTime() - reader[i].borrow_date.getTime();
							if (interval > res[0].limit * 86400000) {
								reader[i].fine = (interval / 86400000 - res[0].limit) * res[0].exceed;
							} else {
								reader[i].fine = 0;
							}
						}
					}
					var push = {};
					push.list = reader;
					socket.emit("borrowRecord", push);
				});
			});
		});

		socket.on("getCatLocList", function () {
			dbase.collection("location").find({}).toArray(function (err, res) {
				dbase.collection("type").find({}).toArray(function (err, res2) {
					var push = {};
					push.location = res;
					push.type = res2;
					socket.emit("CatLocList", push);
				});
			});
		});

		socket.on("getPending", function () {
			dbase.collection("restorePassword").find({ status: "pending" }).toArray(function (err, res) {
				var push = {};
				push.result = res;
				socket.emit("pendingList", push);
			});
		});

		socket.on("refuse", function (data) {
			dbase.collection("restorePassword").updateOne({ "status": "pending", "librarian_id": data }, { $set: { "status": "Rejected" } });
			socket.emit("refuseSuccess");
		});

		socket.on("SendEmail", function (data) {
			dbase.collection("accounts").find({ "username": data.librarian_id }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length == 0) {
					socket.emit('sendFail');
					return;
				}
				server.send({
					text: "Your username is " + doc[0].username + "\n" + "Your password is " + doc[0].password,
					from: "cjiang_5@stu.xidian.edu.cn",        //谁发送的
					to: data.email,       //发送给谁的
					subject: "Bibliosoft: Restore Librarian Password"          //邮件主题
				}, function (err, message) {
					test.equal(null, err);
					socket.emit('sendSuccess');
					dbase.collection("restorePassword").updateOne({ "librarian_id": data.librarian_id, "email": data.email, status: "pending" }, { $set: { status: "Restored" } })
				});
			});
		});

		socket.on("getNotPending", function () {
			var whstr = [];
			whstr.push({ status: "Restored" });
			whstr.push({ status: "Rejected" });
			var whereStr = { $or: whstr };
			dbase.collection("restorePassword").find(whereStr).toArray(function (err, res) {
				var push = {};
				push.result = res;
				socket.emit("notPendingList", push);
			});
		});

		socket.on("editRule", function (data) {
			dbase.collection("config").updateOne({ "varname": "config" }, { $set: { "security": data.security, "limit": data.limit, "exceed": data.exceed, "maxnum": data.maxnum, "reserve": data.reserve } });
			socket.emit("editRuleSuccess");
		});

		socket.on('searchLibrarians', function (data) {
			var orStr = [];
			orStr.push({ librarian_id: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ name: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ phone: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ email: new RegExp('.*' + data + '.*', 'i') });
			var whereStr = { $or: orStr };
			var search_librarians_cursor = dbase.collection("librarian").find(whereStr);
			search_librarians_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				var res = {};
				res.librarian_list = doc;
				socket.emit('librarianList', res);
			});
		});

		//jc10.22
		socket.on('searchReaderBooks', function (data) {		//修改searchbooksjc
			orStr = [];
			orStr.push({ book_name: new RegExp('.*' + data + '.*', 'i') });
			//orStr.push({book_name:'/'+data+'/'});
			orStr.push({ author: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ press: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ publish_year: data });
			orStr.push({ type: data });
			whereStr = { $or: orStr };
			var search_books_cursor = dbase.collection("books").find(whereStr);
			search_books_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				for (var i = 0; i < doc.length; i++) {
					delete doc[i].figure;
				}
				socket.emit('show_search', doc);
			});
		});

		socket.on('searchReaders', function (data) {		//修改searchbooksjc
			var orStr = [];
			orStr.push({ reader_id: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ name: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ email: new RegExp('.*' + data + '.*', 'i') });
			orStr.push({ gender: data });
			var whereStr = { $or: orStr };
			var search_readers_cursor = dbase.collection("reader").find(whereStr);
			search_readers_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				var readerList = {};
				readerList.reader_list = doc;
				socket.emit('readerList', readerList);
			});
		});

		//开始发送邮件

		socket.on('checkEmail', function (data) {
			dbase.collection("reader").find({ "reader_id": data.reader_id }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length == 0) {
					socket.emit('sendFail');
					return;
				}
				doc = doc[0];
				if (doc.email != data.email) {
					socket.emit('sendFail');
					return;
				}
				loginData = {};
				loginData.session = randomString(32);
				loginData.username = data.reader_id;
				loginData.type = 'reader';
				dbase.collection("session").insertOne(loginData);
				console.log(data.href);
				server.send({
					text: "Click this link to login and change your password:\n" + data.href + '?session=' + loginData.session + '&username=' + data.reader_id,       //邮件内容
					from: "cjiang_5@stu.xidian.edu.cn",        //谁发送的
					to: data.email,       //发送给谁的
					subject: "Recovery your password - Bibliosoft"          //邮件主题
				}, function (err, message) {
					socket.emit('sendSuccess');
					console.log(err || message);
				});
			});
		});

		socket.on('getPicture', function (isbn) {
			var orStr = [];
			for (var i = 0; i < isbn.length; i++) {
				orStr.push({ isbn: isbn[i] });
			}
			var whereStr = { $or: orStr };
			dbase.collection("books").find(whereStr).toArray(function (err, res) {
				test.equal(null, err);
				imgs = [];
				for (var i = 0; i < res.length; i++) {
					imgs.push(res[i].figure);
				}
				socket.emit("showPicture", imgs);
			});
		});


		socket.on('reserveBook', function (data) {	//data.reader_id, data.isbn, data.bar_code
			var cur_time = new Date();
			var ms_time = cur_time.getTime();
			dbase.collection('config').find({ varname: 'config' }).toArray(function (err0, doc0) {
				var reserve = doc0[0].reserve;
				var reserveNum = doc0[0].maxnum;
				dbase.collection('reserve').updateMany({ reader_id: data.reader_id, status: true, reserve_time: { $lt: ms_time - reserve * 60 * 60000 } }, { $set: { 'status': false } }, function (err, res) {
					//更新当前用户下有效reserve
					dbase.collection('reserve').find({ reader_id: data.reader_id, status: true }).toArray(function (err1, doc1) {
						//查询当前用户下有效reserve
						dbase.collection("borrows").find({ reader_id: data.reader_id, status: false }).toArray(function (err6, doc6) {
							//查询当前用户下borrow
							if (doc1.length + doc6.length >= reserveNum) {		//reserveNum表示可以预约+借阅的最多本数
								//如果有效预约+出借>=允许最大量
								dbase.collection("reader").updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc1.length + doc6.length } });
								socket.emit('reserveOverflow', reserveNum);
								return;
							} else {
								dbase.collection('reserve').updateMany({ isbn: data.isbn, status: true, reserve_time: { $lt: ms_time - reserve * 60 * 60000 } }, { $set: { status: false } }, function (err2, doc2) {
									//更新待预约书的有效预约
									dbase.collection('reserve').find({ isbn: data.isbn, status: true }).toArray(function (err3, doc3) {
										//查询待预约书的有效预约
										dbase.collection('copies').find({ isbn: data.isbn }).toArray(function (err4, doc4) {
											//查询待预约书的所有copy
											var borrowedList = [];	//记录borrowed的copy，绝对可靠
											var reservedList = [];	//记录reserved的copy，数据不可靠
											var availList = [];		//记录available的copy，数据不可靠
											var updateList = [];	//记录新失效的reserved状态copy

											for (var i = 0; i < doc4.length; i++) {
												if (doc4[i].status == 'borrowed') {
													borrowedList.push(doc4[i]);
												} else if (doc4[i].status == 'available') {
													availList.push(doc4[i]);
												} else {
													var valid = false;
													for (var j = 0; j < doc3.length; j++) {	//reserved状态的copy是否仍然有效
														if (doc3[j].bar_code == doc4[i].bar_code) {
															valid = true;
															break;
														}
													}
													if (valid == false) {	//已经失效
														doc4[i].status = 'available';
														availList.push(doc4[i]);
														updateList.push(doc4[i]);
													} else {
														reservedList.push(doc4[i]);
													}
												}
											}


											if (borrowedList.length + doc3.length >= doc4.length) {//总数<=有效预约+出借
												dbase.collection('books').updateOne({ isbn: data.isbn }, { $set: { available_number: 0 } });
												dbase.collection("reader").updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc1.length + doc6.length } });
												socket.emit('noneToReserve');
											} else {
												var barCodeAvail = false;
												for (var i = 0; i < availList.length; i++) {
													if (availList[i].bar_code == data.bar_code) {
														barCodeAvail = true;	//想预约的copy处于available状态

														dbase.collection('copies').updateOne({ bar_code: parseInt(data.bar_code) }, { $set: { status: 'reserved' } });
														dbase.collection("reader").updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc1.length + doc6.length + 1 } });
														dbase.collection('books').updateOne({ isbn: data.isbn }, { $set: { available_number: availList.length - 1 } });
														dbase.collection('reserve').insertOne({ reader_id: data.reader_id, isbn: data.isbn, reserve_time: ms_time, bar_code: parseInt(data.bar_code), status: true }, function (Err, res) {
															dbase.collection('copies').find({ bar_code: data.bar_code }).toArray(function (err7, doc7) {
																if (doc7.length == 0) return;
																var copyInfo = { location: doc7[0].location, bar_code: parseInt(data.bar_code) };
																socket.emit("reserveSuccess", copyInfo);
															});
														});
													} else {
														dbase.collection('copies').updateOne({ bar_code: parseInt(availList[i].bar_code) }, { $set: { status: 'available' } });
													}
												}
												if (barCodeAvail == false) {	//如果预约的copy不可预约
													socket.emit('noneToReserve');
												}

											}

										});
									});
								});
							}
						})
					});
				});
			});
		});


		socket.on('getReserveList', function (reader_id) {
			var cur_time = new Date();
			var ms_time = cur_time.getTime();

			dbase.collection("config").find({ "varname": "config" }).toArray(function (err, config) {
				dbase.collection('reserve').updateMany({ reader_id: reader_id, reserve_time: { $lt: ms_time - config[0].reserve * 60 * 60000 } }, { $set: { status: false } }, function (err, doc) {
					dbase.collection('reserve').find({ reader_id: reader_id }).toArray(function (err1, doc1) {
						doc1 = doc1.sort(function (a, b) {
							return a.reserve_time < b.reserve_time;
						});
						socket.emit('showReserveList', doc1);
					});
				});
			});
		});

		socket.on('getReserveItem', function (data) {
			dbase.collection("books").find({ isbn: data.isbn }).toArray(function (err, doc) {
				delete doc[0].figure;
				socket.emit('showReserveItem', { book: doc[0], index: data.index, time: data.time, status: data.status, bar_code: data.bar_code });
			});
		});

		socket.on('cancelReserve', function (data) {
			data.status = true;
			dbase.collection("reserve").updateOne(data, { $set: { status: false } }, function (err, res) {
				//取消预约
				dbase.collection('books').find({ isbn: data.isbn }).toArray(function (err1, doc1) {
					//查询剩余可预约书

					dbase.collection('books').updateOne({ isbn: data.isbn }, { $set: { available_number: doc1[0].available_number + res.result.nModified } }, function (err2, res2) {
						//更新书可借出数
						if (res.result.nModified > 0) {	//如果的确有书被取消预约了,则把对应的copy还原为available
							dbase.collection('copies').updateOne({ bar_code: parseInt(data.bar_code) }, { $set: { status: 'available' } });
						}
						dbase.collection('reader').find({ reader_id: data.reader_id }).toArray(function (err3, doc3) {
							dbase.collection('reader').updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc3[0].borrowNum - res.result.nModified } }, function (err4, res4) {
								socket.emit('cancelSuccess');
							});
						});
					});
				});
			});
		});

		socket.on('getBorrowList', function (reader_id) {
			dbase.collection('borrows').find({ reader_id: reader_id }).toArray(function (err, doc) {
				for (var i = 0; i < doc.length; i++) {
					doc[i].borrow_date = parseInt(doc[i].borrow_date.getTime());
					if (doc[i].return_date != '-') {
						doc[i].return_date = parseInt(doc[i].return_date.getTime());
					} else {
						doc[i].return_date = null;
					}
				}
				socket.emit('showBorrowList', doc);
			});
		});
		//jc10.22


		//jc11.9
		socket.on('getReserveDetail', function (isbn) {
			var cur_time = new Date();
			var ms_time = cur_time.getTime();
			var data = {};
			dbase.collection('config').find({ varname: 'config' }).toArray(function (err0, doc0) {
				var reserve = doc0[0].reserve;	//预约时限
				dbase.collection('books').find({ isbn: isbn }).toArray(function (err0, doc0) {	//查询书籍基本信息
					if (doc0 == null || doc0.length == 0) return;
					data.book = doc0[0];	//记录book的信息

					dbase.collection('reserve').updateMany({ isbn: isbn, status: true, reserve_time: { $lt: ms_time - reserve * 60 * 60000 } }, { $set: { status: false } }, function (err1, doc1) {	//更新已失效的reserve
						dbase.collection('reserve').find({ isbn: isbn, status: true }).toArray(function (err2, doc2) {	//查询有效的reserve
							dbase.collection('copies').find({ isbn: isbn }).toArray(function (err3, doc3) {	//查询当前所有copy
								var borrowedList = [];
								var reservedList = [];
								var availList = [];
								var updateList = [];
								for (var i = 0; i < doc3.length; i++) {	//把copy按status分类
									if (doc3[i].status == 'available') {
										availList.push(doc3[i]);
									} else if (doc3[i].status == 'borrowed') {
										borrowedList.push(doc3[i]);
									} else {
										var valid = false;
										for (var j = 0; j < doc2.length; j++) {
											if (doc3[i].bar_code == doc2[j].bar_code) {
												valid = true;
												break;
											}
										}
										if (valid == false) {	//copy的reserved属性已经失效，改为availbale
											doc3[i].status = 'available';
											availList.push(doc3[i]);
											dbase.collection('copies').updateOne({ bar_code: parseInt(doc3[i].bar_code) }, { $set: { status: 'available' } });//更新状态
										} else {	//copy的reserved仍然有效
											reservedList.push(doc3[i]);
										}
									}
								}
								dbase.collection('books').updateOne({ isbn: isbn }, { $set: { available_number: availList.length } });//更新book的avail_number
								data.borrowed = borrowedList;
								data.reserved = reservedList;
								data.available = availList;
								socket.emit('showReserveDetail', data);
							});
						});
					});
				});
			});
		});
		//jc10.22

		//高雅


		//...edit, add and delete announcement...
		socket.on("getAnnouncementList", function (data) {
			dbase.collection("news").find({}).sort({ "date": -1 }).toArray(function (err, res) {
				var retdata = {};
				retdata.annoucement_list = res;
				socket.emit("AnnouncementList", retdata);
			});
		});


		socket.on("deleteAnnouncement", function (data) {
			dbase.collection("news").deleteOne({ "title": data.title }, function (err, res) {
				test.equal(null, err);
				socket.emit("deleteAnnouncementSuccess");
			});
		});
		//get a specific announcementinfo
		socket.on("getAnnouncementInfo", function (data) {
			dbase.collection("news").find({ "title": data.title }).toArray(function (err, res) {
				var retdata = {};
				retdata.content = res[0].content;
				retdata.title = res[0].title;
				socket.emit("AnnouncementInfo", retdata);
			});
		});
		socket.on("editAnnouncement", function (data) {
			var cur_time = new Date();
			dbase.collection("news").updateOne({ "title": data.title }, { $set: { "content": data.content, "librarian_id": data.librarian_id, "date": cur_time } });
			socket.emit("editAnnouncementSuccess");
		});
		socket.on("addAnnouncement", function (data) {
			data.date = new Date();
			dbase.collection("news").insertOne(data, function (err, doc) {
				socket.emit("addAnnouncementSuccess");
			});
		});

		//位置的删除
		socket.on("deletelocation", function (data) {
			dbase.collection("location").deleteOne({ "location": data.location }, function (err, res) {
				test.equal(null, err);
				socket.emit("DeletelocationSuccess");
			});
			dbase.collection("books").updateMany({ "location": data.location }, { $set: { "location": "Undetermined" } });

		});

		//位置的添加
		socket.on("addlocation", function (data) {
			dbase.collection("location").insertOne({ "location": data.location_name }, function (err, res) {
				test.equal(null, err);
				socket.emit("addlocationSuccess");
			});
		});

		//类型的添加
		socket.on("addType", function (data) {
			dbase.collection("type").insertOne({ "type": data.type_name }, function (err, res) {
				test.equal(null, err);
				socket.emit("addtypeSuccess");
			});
		});

		//位置的编辑
		socket.on("editlocation", function (data) {
			dbase.collection("location").updateOne({ "location": data.oldloc }, { $set: { "location": data.newloc } });
			dbase.collection("books").updateMany({ "location": data.oldloc }, { $set: { "location": data.newloc } });
			socket.emit("editlocationSuccess");
		});

		//类型的编辑
		socket.on("editbookType", function (data) {
			dbase.collection("type").updateOne({ "type": data.oldtype }, { $set: { "type": data.newtype } });
			dbase.collection("books").updateMany({ "type": data.oldtype }, { $set: { "type": data.newtype } });
			socket.emit("editbooktypeSuccess");
		});

		socket.on("viewincome", function (data) {
			var type = data.type;
			var cursor;
			if (data.origin) {
				cursor = dbase.collection("income").find({}).sort({ "date": -1 });
			}
			else {
				var start = data.start;
				var end = data.end;
				var start_date = new Date(start.replace(/-/, "/"));
				var end_date = new Date(end.replace(/-/, "/"));
				cursor = dbase.collection("income").find({ "date": { $gte: start_date, $lte: end_date } }).sort({ "date": -1 });
			}
			cursor.toArray(function (err, doc) {
				var retdata = {};
				retdata.incomelist = doc;
				socket.emit("incomeList", retdata);// Return the detail information of all income between two dates;
				//Following part return the information for drawing.

				var fine = [];
				var deposit = [];
				var xdate = [];
				if (type == "Year") {
					var curfine = 0, curdeposit = 0;
					var curyear = doc[0].date.getYear();
					for (var i = 0; i < doc.length; i++) {
						if (doc[i].date.getYear() == curyear) {
							if (doc[i].type == "fine")
								curfine += doc[i].value;
							else curdeposit += doc[i].value;
						}
						else {
							xdate.push(curyear + 1900);
							fine.push(curfine);
							deposit.push(curdeposit);
							curyear = doc[i].date.getYear();
							curfine = 0;
							curdeposit = 0;
							i--;
						}
					}
					xdate.push(curyear + 1900);
					fine.push(curfine);
					deposit.push(curdeposit);
				}
				else if (type == "Month") {
					var curfine = 0, curdeposit = 0;
					var curyear = doc[0].date.getYear();
					var curmonth = doc[0].date.getMonth();
					for (var i = 0; i < doc.length; i++) {
						if (doc[i].date.getYear() == curyear && doc[i].date.getMonth() == curmonth) {
							if (doc[i].type == "fine")
								curfine += doc[i].value;
							else curdeposit += doc[i].value;
						}
						else {
							xdate.push(curyear + 1900 + "." + (curmonth + 1));
							fine.push(curfine);
							deposit.push(curdeposit);
							curyear = doc[i].date.getYear();
							curmonth = doc[i].date.getMonth();
							curfine = 0;
							curdeposit = 0;
							i--;
						}
					}
					xdate.push(curyear + 1900 + "." + (curmonth + 1));
					fine.push(curfine);
					deposit.push(curdeposit);
				}
				else {
					var curfine = 0, curdeposit = 0;
					var curyear = doc[0].date.getYear();
					var curmonth = doc[0].date.getMonth();
					var curdate = doc[0].date.getDate();
					for (i = 0; i < doc.length; i++) {
						if (doc[i].date.getYear() == curyear && doc[i].date.getMonth() == curmonth && doc[i].date.getDate() == curdate) {
							if (doc[i].type == "fine")
								curfine += doc[i].value;
							else curdeposit += doc[i].value;
						}
						else {
							xdate.push(curyear + 1900 + "." + (curmonth + 1) + "." + curdate);
							fine.push(curfine);
							deposit.push(curdeposit);
							curyear = doc[i].date.getYear();
							curmonth = doc[i].date.getMonth();
							curdate = doc[i].date.getDate();
							curfine = 0;
							curdeposit = 0;
							i--;
						}
					}
					xdate.push(curyear + 1900 + "." + (curmonth + 1) + "." + curdate);
					fine.push(curfine);
					deposit.push(curdeposit);
				}
				var ret = {};
				ret.xdate = xdate;
				ret.yfine = fine;
				ret.ydeposit = deposit;
				socket.emit("incomepicture", ret);
			});
		});

		socket.on('passwordrecovery', function (data) {
			var auth_cursor = dbase.collection("librarian").find({ "librarian_id": data.username });
			auth_cursor.toArray(function (err, doc) {
				test.equal(null, err);
				var successData = {};
				if (doc.length == 0) {
					socket.emit("nouser1");
				} else {
					if (doc[0].email == data.email) {
						successData.librarian_id = doc[0].librarian_id;
						successData.email = doc[0].email;
						socket.emit("passwordrecoverySuccess");
						successData.status = "pending";
						dbase.collection("restorePassword").insertOne(successData);
					} else {
						socket.emit("wrongemail");
					}
				}
			});
		});

		socket.on("getDouban", function (data) {
			var url = api_url + data;
			var client = request.createClient(url);
			client.get('', function (err, res, body) {
				test.equal(null, err);
				if (body.hasOwnProperty("msg")) return;
				var bookInfo = {};
				bookInfo.title = body.title;
				bookInfo.author = body.author[0];
				for (var i = 1; i < body.author.length; i++) {
					bookInfo.author += " " + body.author[i];
				}
				bookInfo.press = body.publisher;
				bookInfo.year = body.pubdate.substring(0, 4);
				bookInfo.subject = body.summary;
				bookInfo.pages = parseInt(body.pages)
				bookInfo.price = parseFloat(body.price.replace("元", ""));
				bookInfo.figure = body.images.small;
				socket.emit("bookInfoOfDouban", bookInfo);
			});

		});

		socket.on("plusBook", function (data) {
			dbase.collection("books").find({ "isbn": data.isbn }).toArray(function (err, doc) {
				dbase.collection("books").updateOne({ "isbn": data.isbn }, { $set: { "total_number": doc[0].total_number + data.number, "available_number": doc[0].available_number + data.number } });
				var barcode_list = [];
				var cur = 0;
				dbase.collection("globalVar").find({ "var_name": "bar_code" }).toArray(function (err, doc) {
					cur = doc[0].bar_code;
					dbase.collection("globalVar").updateOne({ "var_name": "bar_code" }, { $set: { "bar_code": cur + data.number } });
					var copy_datas = [];
					for (var i = 0; i < data.number; i++) {
						var copy_data = {};
						copy_data.status = "available";
						copy_data.isbn = data.isbn;
						copy_data.bar_code = cur + i;
						copy_data.location = data.location;
						barcode_list.push(cur + i);
						copy_datas.push(copy_data);
					}
					dbase.collection("copies").insertMany(copy_datas);
					socket.emit("barcodeList", { "barcode_list": barcode_list });
					socket.emit("addBookSuccess");
				});
			});
		});

		function changeContent(data, len) {
			if (data.length > len) {
				data = data.substr(0, len - 3) + "...";
			}
			return data;
		}

		socket.on("releaseAnnouncement", function () {
			dbase.collection("news").find().sort({ "date": -1 }).toArray(function (err, doc) {
				test.equal(null, err);
				for (var i = 0; i < 3; i++) {
					var announce_data = {};
					if (i < doc.length) {
						announce_data.title = doc[i].title;
						announce_data.content = doc[i].content;
						announce_data.content = changeContent(announce_data.content, 98);
						announce_data.date = doc[i].date.toLocaleString().substr(0, 10);
					} else {
						announce_data.title = "NULL";
						announce_data.content = ""
						announce_data.date = "";
					}
					socket.emit("getAnnounce" + (i + 1).toString(), announce_data);
				}
			});
		});

		socket.on('getAllAnnouncement', function () {
			dbase.collection("news").find().sort({ "date": -1 }).toArray(function (err, doc) {
				test.equal(null, err);
				for (var i = 0; i < doc.length; i++) {
					delete doc[i].librarian_id;
					doc[i].date = doc[i].date.toLocaleString().substr(0, 10);
				}
				socket.emit('show_announcement', doc.slice(0, 3));
			});
		});

		socket.on("getAnnounceDetail", function (data) {
			dbase.collection("news").find({ "title": data.title }).toArray(function (err, res) {
				test.equal(null, err);
				var ann = {};
				ann.annDetail = res[0];
				socket.emit("annDetail", ann);
			});
		});

		socket.on("getMessageNumbers", function () {
			dbase.collection("restorePassword").find({ status: "pending" }).toArray(function (err, doc) {
				test.equal(null, err);
				socket.emit("messageNumbers", doc.length);
			});
		});

		socket.on("getCopyDetail", function (data) {
			dbase.collection("copies").find({ bar_code: data.bar_code }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length != 0) {
					var result = {};
					result.copyDetail = doc[0];
					socket.emit("copyDetail", result);
				}
			});
		});

		socket.on("editCopy", function (data) {
			dbase.collection("copies").updateOne({ "bar_code": data.bar_code }, { $set: { "location": data.location } });
			socket.emit("editCopySuccess");
		});

		socket.on("getSecurity", function () {
			dbase.collection("config").find({ varname: "config" }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length != 0) {
					var result = {};
					result.scr = doc[0].security;
					socket.emit("security", result);
				}
			});
		});

		socket.on("getCopyBorrow", function (data) {
			dbase.collection("borrows").find({ bar_code: data, status: false }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length != 0) {
					var result = {};
					dbase.collection("reader").find({ reader_id: doc[0].reader_id }).toArray(function (err1, res1) {
						test.equal(null, err1);
						if (res1.length != 0) {
							result.person = res1[0].name;
							result.bar_code = data;
							socket.emit("copyBorrow", result);
						}
					});
				}
			});
		});

		socket.on("getCopyReserve", function (data) {
			dbase.collection("reserve").find({ bar_code: data, status: true }).toArray(function (err, doc) {
				test.equal(null, err);
				if (doc.length != 0) {
					var result = {};
					dbase.collection("reader").find({ reader_id: doc[0].reader_id }).toArray(function (err1, res1) {
						test.equal(null, err1);
						if (res1.length != 0) {
							result.person = res1[0].name;
							result.bar_code = data;
							socket.emit("copyReserve", result);
						}
					});
				}
			});
		});


		//The scope which all bussiness defined in. end--------------------------------------------------------------
	});
});
