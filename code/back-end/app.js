
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

	var email = require("emailjs");
	var server = email.server.connect({
		user: "cjiang_5@stu.xidian.edu.cn",      // 你的QQ用户
		password: "SomeoneFuck8005",           // 注意，不是QQ密码，而是刚才生成的授权码
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
			var addresult = {};
			data.reader_id = data.phone;
			data.borrowNum = 0;
			dbase.collection("reader").insertOne(data, function (err, res) {
				addresult.reader_id = data.reader_id;
				socket.emit("addReaderRoleSuccess", addresult);
				var auth_data = {};
				auth_data.username = data.reader_id;
				auth_data.password = "12345678";
				auth_data.type = "reader";
				dbase.collection("accounts").insertOne(auth_data);
				var auth_data1 = {};
				auth_data1.date = new Date();
				auth_data1.type = "deposit";
				auth_data1.value = 300;
				auth_data1.reader_id = data.reader_id;
				dbase.collection("income").insertOne(auth_data1);
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

		socket.on("deleteReader", function (data) {
			dbase.collection("borrows").find({ "reader_id": data.reader_id }).toArray(function (err, doc) {
				for (var i = 0; i < doc.length; i++) {
					if (doc[i].status == false) {
						socket.emit("notAllReturned");
						return;
					}
				}
				dbase.collection("reader").remove({ "reader_id": data.reader_id }, function (err, res) {
					test.equal(null, err);
					socket.emit("deleteReaderSuccess");
				});
				dbase.collection("accounts").deleteOne({ "username": data.reader_id });
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

		socket.on("deleteReader", function (data) {
			dbase.collection("borrows").find({ "reader_id": data.reader_id }).toArray(function (err, doc) {
				for (var i = 0; i < doc.length; i++) {
					if (doc[i].status == false) {
						socket.emit("notAllReturned");
						return;
					}
				}
				dbase.collection("reader").remove({ "reader_id": data.reader_id }, function (err, res) {
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
							var reader_info = {};
							reader_info.reader_id = res[0].reader_id;
							reader_info.reader_id = res[0].reader_id;
							dbase.collection("reader").find({ "reader_id": reader_info.reader_id }).toArray(function (err, res) {
								test.equal(null, err);
								if (res.length != 0) {
									reader_info.name = res[0].name;
									socket.emit("readerInfoForReturn", reader_info);
								}
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
						test.equal(null, err);
						if (copies.length == 0) {
							socket.emit("copyNotExist");
							return;
						}
						if (copies[0].status == "borrowed") {
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
								dbase.collection("reserve").find({ "reader_id": data.phone, "isbn": books[0].isbn, "status": true }).toArray(function (err, reserve) {
									if (reserve.length == 0) {
										dbase.collection("books").updateOne({ "isbn": copies[0].isbn }, { $set: { "available_number": books[0].available_number - 1 } });
										dbase.collection("reader").updateOne({ "reader_id": data.phone }, { $set: { "borrowNum": reader[0].borrowNum + 1 } });
									} else {
										dbase.collection("reserve").updateOne({ "isbn": books[0].isbn, "reader_id": data.phone, "status": true }, { $set: { "status": false } });
									}
									dbase.collection("copies").updateOne({ "bar_code": data.bar_code }, { $set: { "status": "borrowed" } });
									var insert_data = {};
									insert_data.book_name = books[0].book_name;
									insert_data.reader_id = data.phone;
									insert_data.bar_code = data.bar_code;
									insert_data.lend_librarian_id = data.lend_librarian_id;
									insert_data.return_librarian_id = "-";
									insert_data.borrow_date = new Date();
									insert_data.return_date = "-";
									insert_data.status = false;
									insert_data.fine = 0;
									insert_data.isbn = books[0].isbn;
									dbase.collection("borrows").insertOne(insert_data);
									socket.emit("borrowSuccess");
								});
							});
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
					console.log(interval);
					if (interval > res2[0].limit * 60 * 60000) {
						var fine = (interval / 60 / 60000 - res2[0].limit) * res2[0].exceed;
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
							if (interval > res[0].limit * 60 * 60000) {
								reader[i].fine = (interval / 60 / 60000 - res[0].limit) * res[0].exceed;
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

		socket.on("getCatLocList", function (data) {
			dbase.collection("location").find({}).toArray(function (err, res) {
				dbase.collection("type").find({}).toArray(function (err, res2) {
					var push = {};
					push.location = res;
					push.type = res2;
					socket.emit("CatLocList", push);
				});
			});
		});

		socket.on("editRule", function (data) {
			dbase.collection("config").updateOne({ "varname": "config" }, { $set: { "security": data.security, "limit": data.limit, "exceed": data.exceed, "maxnum": data.maxnum, "reserve": data.reserve } });
			socket.emit("editRuleSuccess");
		});

		socket.on('searchLibrarians', function (data) {
			var whereStr = {};
			if (data.librarian_id != '') whereStr['librarian_id'] = data.librarian_id;
			if (data.name != '') whereStr['name'] = data.name;
			if (data.phone != '') whereStr['phone'] = data.phone;
			if (data.email != '') whereStr['email'] = data.email;

			var cursor = dbase.collection("librarian").find(whereStr);
			cursor.toArray(function (err, doc) {
				test.equal(null, err);
				var result = {};
				result.librarianList = doc;
				socket.emit('searchLibrariansResult', result);
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
				for (var i = 0; i < doc.length; i++)
					delete doc[i].figure;
				//console.log(doc);
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
					text: data.href + '?session=' + loginData.session + '&username=' + data.reader_id,       //邮件内容
					from: "cjiang_5@stu.xidian.edu.cn",        //谁发送的
					to: data.email,       //发送给谁的
					subject: "changePasswd"          //邮件主题
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


		socket.on('reserveBook', function (data) {
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
								dbase.collection('reserve').updateMany({ isbn: data.isbn, status: true, reserve_time: { $lt: ms_time - reserve * 60000 } }, { $set: { status: false } }, function (err2, doc2) {
									//更新待预约书的有效预约
									dbase.collection('reserve').find({ isbn: data.isbn, status: true }).toArray(function (err3, doc3) {
										//查询待预约书的有效预约
										dbase.collection('copies').find({ isbn: data.isbn, status: 'borrowed' }).toArray(function (err4, doc4) {
											//查询待预约书的出借数量
											dbase.collection('copies').find({ isbn: data.isbn }).toArray(function (err5, doc5) {
												//查询待预约书的总数
												if (doc4.length + doc3.length >= doc5.length) {//总数=有效预约+出借
													//console.log(doc3);
													//dbase.collection('copies').find({isbn:data.isbn,status:'available'}).toArray(function(err5,doc5){

													dbase.collection('books').updateOne({ isbn: data.isbn }, { $set: { available_number: 0 } });
													dbase.collection("reader").updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc1.length + doc6.length } });
													socket.emit('noneToReserve');
													//});
												} else {

													dbase.collection("reader").updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc1.length + doc6.length + 1 } });
													dbase.collection('books').updateOne({ isbn: data.isbn }, { $set: { available_number: doc5.length - doc4.length - doc3.length - 1 } });
													dbase.collection('reserve').insertOne({ reader_id: data.reader_id, isbn: data.isbn, reserve_time: ms_time, status: true }, function (Err, res) {
														socket.emit('reserveSuccess');
													});
												}
											});
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
				socket.emit('showReserveItem', { book: doc[0], index: data.index });
			});
		});

		socket.on('cancelReserve', function (data) {
			data.status = true;
			dbase.collection("reserve").updateOne(data, { $set: { status: false } }, function (err, res) {
				dbase.collection('books').find({ isbn: data.isbn }).toArray(function (err1, doc1) {
					dbase.collection('books').updateOne({ isbn: data.isbn }, { $set: { available_number: doc1.length + res.result.nModified } }, function (err2, res2) {
						dbase.collection('reader').find({ reader_id: data.reader_id }).toArray(function (err3, doc3) {
							dbase.collection('reader').updateOne({ reader_id: data.reader_id }, { $set: { borrowNum: doc[0].borrowNum + res.result.nModified } }, function (err4, res4) {
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

		//高雅


		//...edit, add and delete announcement...
		socket.on("getAnnouncementList", function (data) {
			dbase.collection("news").find({}).toArray(function (err, res) {
				var retdata = {};
				for (var i = 0; i < res.length; i++) {
					delete res[i].content;
				}
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
				cursor = dbase.collection("income").find({}).sort({ "date": 1 });
			}
			else {
				var start = data.start;
				var end = data.end;
				var start_date = new Date(start.replace(/-/, "/"));
				var end_date = new Date(end.replace(/-/, "/"));
				cursor = dbase.collection("income").find({ "date": { $gte: start_date, $lte: end_date } }).sort({ "date": 1 });
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
						successData.status = true;
						dbase.collection("restorePassword").insertOne(successData);
					} else {
						socket.emit("wrongemail");
					}
				}
			});
		});
		//The scope which all bussiness defined in. end--------------------------------------------------------------
	});
});
