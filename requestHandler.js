const fs = require("fs");
const axios = require("axios");
const URL = require("url-parse");
const tough = require("tough-cookie");
const Response = require("./response")
const Cookie = tough.Cookie;


// Small hack to add axios cookie support, shame it doesn't come out of the box
function setCookieJar(cookieJar) {
	axios.interceptors.request.use(function (config) {
		cookieJar.getCookies(config.url, function(err, cookies) {
			config.headers.cookie = cookies.join("; ");
		});
		return config;
	});
	
	axios.interceptors.response.use(function (response) {
		if (response.headers["set-cookie"] instanceof Array) {
			cookies = response.headers["set-cookie"].forEach(function (c) {
				cookieJar.setCookie(Cookie.parse(c), response.config.url, function(err, cookie){});
			});
		}
		if (response.status === 503 && response)
		return response;
	});
}

class RequestHandler {
	constructor() {
		this.cookieJar = new tough.CookieJar();
		this._userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		// Self explanatory funky arrow funcs
		this.setCookieJar = () => setCookieJar(this.cookieJar);
		this._getRandomUA = () => this._userAgents[Math.floor(Math.random() * this._userAgents.length)];
		this._extractHostFromUrl = (url) => URL(url).host;
		this.setCookieJar() // Set the jar
		// Test for errors on module level, don't throw err when code !== 200
		this.validateStatus = status => status >= 200 && status < 600;
	}
	
	_getRequestHeaders(url) {
		let headers = {};
		headers["Host"] = this._extractHostFromUrl(url);
		headers["Connection"] = "keep-alive";
		headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
		headers["Accept-Encoding"] = "gzip, deflate, br";
		headers["User-Agent"] = this._getRandomUA();
		
		return headers;
	}
	
	async get(url, headers) {
		return await axios.get(url, {
			headers: headers || this._getRequestHeaders(url),
			jar: this.cookieJar,
			validateStatus: this.validateStatus
		})
	}
	
	async post(url, postBody, headers) {
		axios.post(url, postBody, {
			headers: headers || this._getRequestHeaders(url),
			jar: this.cookieJar,
			validateStatus: this.validateStatus
		})
	}
	
	async sendRequest(url, method=null, headers=null) {
		try {
			let res = await axios({
				method: method || "GET",
				url: url,
				headers: headers || this._getRequestHeaders(url),
				jar: this.cookieJar,
				validateStatus: this.validateStatus
			})
			return new Response(res.status,res.statusText,res.headers,res.data, res.config.jar)
		} catch (err) {
			throw Error(`An error occurred while sending the request:\n${err}`);
		}
	}
}

module.exports = RequestHandler;