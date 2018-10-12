const fs = require("fs");
const axios = require("axios");
const URL = require("url-parse");
const tough = require("tough-cookie");
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
		this._userAgentList = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		this.UA = this._getRandomUA(); // set UserAgent
		this._patchAxios(); // Set the jar
		this.validateStatus = ignoreHttpErrors ?
			status => status === 503 ? true : status >= 200 && status < 400
			:
			status => status >= 200 && status < 600
	}
	
	_getRandomUA() {
		return this._userAgentList[Math.floor(Math.random() * this._userAgentList.length)];
	}
	
	_patchAxios() {
		setCookieJar(this.cookieJar);
	}
	
	parseUrl(url) {
		return URL(url);
	}
	
	_getRequestHeaders(url) {
		let headers = {};
		headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
		headers["Accept-Encoding"] = "gzip, deflate, br";
		headers["Accept-Language"] = "en-US,en;q=0.5";
		headers["Connection"] = "keep-alive";
		headers["Host"] = this.parseUrl(url).host;
		headers["Upgrade-Insecure-Requests"] = "1";
		headers["User-Agent"] = this.UA;
		
		return headers;
	}
	
	async sendRequest(url, data=null, method=null, headers=null) {
		if (method && method.toUpperCase() === "POST" && !data) {
			throw Error("Cannot send POST request with empty body");
		}
		try {
			let res = await axios({
				method: method || "GET",
				url: url,
				headers: headers || this._getRequestHeaders(url),
				jar: this.cookieJar,
				validateStatus: this.validateStatus,
				data: data
			})
			return res;
		} catch (err) {
			throw Error(`An error occurred while sending the request:\n${err}`);
		}
	}
}

module.exports = HumanoidRequester;