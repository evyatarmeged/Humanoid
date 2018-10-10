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
		return response;
	});
}

class HumanoidRequester {
	constructor(ignoreHttpErrors=true) {
		this.cookieJar = new tough.CookieJar();
		this._userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		// Self explanatory funky arrow funcs
		this._getRandomUA = () => this._userAgents[Math.floor(Math.random() * this._userAgents.length)];
		this._patchAxios() // Set the jar
		/* Test for errors on module level, don't throw err when code !== 200
		This is axios normal behavior, will throw an Error on anything that isn't an OK or a redirect
	  with the exception of a 503 HTTP status code which is, typically, the JavaScript challenge */
		this.validateStatus = ignoreHttpErrors ?
			status => status === 503 ? true : status >= 200 && status < 400
			:
			status => status >= 200 && status < 600
	}
	
	_patchAxios() {
		setCookieJar(this.cookieJar);
	}
	
	parseUrl(url) {
		return URL(url);
	}
	
	
	_getRequestHeaders(url) {
		let headers = {};
		headers["Host"] = this.parseUrl(url).host;
		headers["Connection"] = "keep-alive";
		headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
		headers["Accept-Encoding"] = "gzip, deflate, br";
		headers["User-Agent"] = this._getRandomUA();
		
		return headers;
	}
	
	async sendRequest(url, data=null, method=null, headers=null) {
		if (method && method.toUpperCase() === "POST" && !data) {
			throw Error("Cannot send POST request with empty body");
		}
		try {
			return await axios({
				method: method || "GET",
				url: url,
				headers: headers || this._getRequestHeaders(url),
				jar: this.cookieJar,
				validateStatus: this.validateStatus,
				data: data
			})
		} catch (err) {
			throw Error(`An error occurred while sending the request:\n${err}`);
		}
	}
}

module.exports = HumanoidRequester;