(function() {
	var Pocket,
		POSTrequest, open;

	var createParams = function(consumer_key, access_token, obj) {
		obj = obj || {};
		obj.consumer_key = consumer_key;
		obj.access_token = access_token;
		return obj;
	};

	var URI = {
			ADD: "https://getpocket.com/v3/add",
			MODIFY: "https://getpocket.com/v3/modify",
			RETRIEVE: "https://getpocket.com/v3/get",
			REQUEST: "https://getpocket.com/v3/oauth/request",
			AUTHORIZE: "https://getpocket.com/v3/oauth/authorize",
			G_AUTHORIZE: "https://getpocket.com/auth/authorize"
		};

	Pocket = function(consumer_key, access_token) {
		this.consumer_key = consumer_key;
		this.access_token = access_token;
	};
	Pocket.prototype = {
		constructor: Pocket,
		/**
		 * Adds an item to pocket.
		 * {@see http://getpocket.com/developer/docs/v3/add}
		 *
		 * @param {!Object} params Object with the details of the item
		 *   to add. And url key-value must exists.
		 * @param {!function(?Error, ?number, ?Object)} callback
		 *   Callback function. It has three arguments. An error, if
		 *   there was one, the status and the item added.
		 */
		add: function(params, callback) {
			POSTrequest(
				URI.ADD,
				createParams(this.consumer_key, this.access_token, params),
				function(err, data) {
					if(err) {
						callback(err);
					} else {
						callback(null, data.status, data.item);
					}
				});
		},
		modify: function(params, callback) {
			POSTrequest(
				URI.MODIFY,
				createParams(this.consumer_key, this.access_token, params),
				function(err, data) {
					if(err) {
						callback(err);
					} else {
						callback(null, data.status, data.item);
					}
				});
		},
		retrieve: function(params, callback) {
			POSTrequest(
				URI.RETRIEVE,
				createParams(this.consumer_key, this.access_token, params),
				function(err, data) {
					if(err) {
						callback(err);
					} else {
						callback(null, data.status, data.list);
					}
				});
		}
	};
	Pocket.auth = {
		request: function(consumer_key, redirect_uri, callback) {
			POSTrequest(
				URI.REQUEST,
				{
					"consumer_key": consumer_key,
					"redirect_uri": redirect_uri
				},
				function(err, data, url) {
					if(err) {
						callback(err);
					}else{
						callback(null, data.code);
					}
				});
		},
		authorize: function(consumer_key, request_token, callback) {
			POSTrequest(
				URI.AUTHORIZE,
				{
					"consumer_key": consumer_key,
					"code": request_token
				},
				function(err, data, url) {
					if(err) {
						callback(err);
					}else{
						callback(null, data.access_token, data.username);
					}
				});
		},
		getAuthorizeURL: function(token, redirectUrl) {
			return URI.G_AUTHORIZE+"?request_token="+token+"&redirect_uri="+redirectUrl;
		}
	};
	/**
	 * Automates the login process.
	 * It receives a consumer key; a redirect uri, to redirect the
	 *   user after authorizing or not the application; a "middle"
	 *   callback, and the final callback.
	 * The middle callback receives the URI so that the user can allow
	 *   the use of the application and a callback, to be called after
	 *   the user has authorized or not.
	 * The final callback has as arguments an error, if one has
	 *   occurred, the access token and the username, these two are
	 *   only defined if no error occurred.
	 *
	 * @param  {!string} consumer_key Application's consumer key.
	 * @param  {!string} redirect_uri Redirect URI.
	 * @param  {!function(!string, !function())} middleCallback Middle
	 *   process callback.
	 * @param  {!function(=Error, =string, =string)} callback Callback
	 *   function.
	 */
	Pocket.auth.custom_login = function(consumer_key, redirect_uri, middleCallback, callback) {
		//console.log("c_login");
		Pocket.auth.request(consumer_key, redirect_uri, function(err, code) {
			//console.log("received request");
			var done = function() {
				//console.log("middleCallback responded");
				Pocket.auth.authorize(consumer_key, code, function(err, access_token, username) {
					//console.log("auth");
					callback(err, access_token, username);
				});
			}

			if(err) {
				console.log("err");
				console.log(err);
				callback(err);
			} else {
				middleCallback(Pocket.auth.getAuthorizeURL(code, encodeURIComponent(redirect_uri)), done);
			}
		})
	};
	// client
	Pocket.auth.loginBrowser = function(consumer_key, callback) {
		var exec;
		var middle = function(url, done) {
			open(url);
			done();
		};
		//12.5seconds, ie. try 25 times with an interval of 500ms
		var count = 0, MAX = 25;
		var clbck = function(err, access_token, username) {
			if(err && count<MAX) { //is appropriate error
				count++;
				setTimeout(function() {
					exec();
				}, 500);
			}
			callback(err, access_token, username);
		};
		exec = function() {
			Pocket.auth.custom_login(consumer_key, "http://google.com", middle, clbck);
		}
		exec();
	};
	// server
	Pocket.auth.loginNode = function(consumer_key, callback, port) {
		var express = require('express');
		port = port || 8081;
		Pocket.auth.custom_login(
			consumer_key,
			"http://localhost:"+port+"",
			function(url, done) {
				var server;
				var app = express();
				app.get('*', function(req, res) {
					done();
					res.end('<script>window.close();</script>');
					server.close();
				});
				server = app.listen(port);
				server.timeout = 1200;
				open(url);
			},
			callback);
	};
	/**
	 * State of an item.
	 *
	 * @type {!Object}
	 * @enum
	 */
	Pocket.STATE = {
		ALL: "all",
		UNREAD: "unread",
		ARCHIVE: "archive"
	};
	/**
	 * Detail of item(s).
	 *
	 * @type {!Object}
	 * @enum
	 */
	Pocket.DETAIL_TYPE = {
		SIMPLE: "simple",
		COMPLETE: "complete"
	};
	/**
	 * Sorting of a list.
	 *
	 * @type {!Object}
	 * @enum
	 */
	Pocket.SORT = {
		NEWEST: "newest",
		OLDEST: "oldest",
		TITLE: "title",
		SITE: "site"
	};
	/**
	 * Type of item.
	 *
	 * @type {!Object}
	 * @enum
	 */
	Pocket.CONTENT_TYPE = {
		ARTICLE: "article",
		VIDEO: "video",
		IMAGE: "image"
	};
	/**
	 * Tag type.
	 *
	 * @type {!Object}
	 * @enum
	 */
	Pocket.TAG = {
		UNTAGGED: "_untagged_"
	};
	/**
	 * Favorite.
	 *
	 * @type {!Object}
	 * @enum
	 */
	Pocket.FAVORITE = {
		YES: 1,
		NO: 0
	};

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
		var request = require("https").request,
			urlUtils = require("url"),
			exec = require('child_process').exec;
		POSTrequest = (function() {
			return function(url, data, callback) {
				var options = urlUtils.parse(url);
				options.method = "POST";
				options.headers = {
					"Content-Type": "application/json; charset=UTF-8",
					"X-Accept": "application/json"
				};
				var req = request(options, function(res) {
					var data = "";
					res.on("data", function(chunk) {
						data += chunk;
					});
					res.on("end", function() {
						try{
							callback(undefined, JSON.parse(data));
						}catch(err) {
							callback(err);
						}
					});
				});
				req.on("error", function(e) {
					callback(err);
				});
				req.write(JSON.stringify(data));
				req.end();
			};
		})();
		open = function(url) {
			exec('xdg-open "'+url+'"');
		};
		module.exports = Pocket;
	} else {
		POSTrequest = function(url, data, callback) {
			var xhr = new XMLHttpRequest();

			xhr.open("POST", url, true);

			xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
			xhr.setRequestHeader("X-Accept", "application/json");

			xhr.send(JSON.stringify(data));

			xhr.onreadystatechange = function() {
				if( xhr.readyState === xhr.DONE ) {
					var response, err;
					try {
						response = JSON.parse(xhr.responseText);
					} catch (e) {
						err = e;
					}
					callback(err, response);
				}
			}
		};
		open = function(url) {
			var win = window.open(url, '_blank');
			win.focus();
		};
		window.Pocket = Pocket;
	}

})();