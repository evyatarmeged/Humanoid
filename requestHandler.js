const fs = require("fs");
const axios = require("axios");
const URL = require("url-parse");
const tough = require("tough-cookie");
const Response = require("./response")
const Cookie = tough.Cookie;


// Add axios cookie support, too bad for the hacky solution tbh
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


class RequestHandler {
	constructor() {
		this.cookieJar = new tough.CookieJar();
		this._userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		setCookieJar(this.cookieJar);
		// Self explanatory funky arrow funcs
		this._getRandomUA = () => this._userAgents[Math.floor(Math.random() * this._userAgents.length)];
		this._extractHostFromUrl = (url) => URL(url).host;
	}
	
	javascriptChallengeInResponse(htmlResponse) {
		return htmlResponse.indexOf("jschl") > -1 && htmlResponse.indexOf("DDoS protection by Cloudflare") > -1;
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
	
	async sendRequest(url, method=null, headers=null) {
		try {
			let res = await axios({
				method: method || "GET",
				url: url,
				headers: headers || this._getRequestHeaders(url),
				jar: this.cookieJar,
				validateStatus: function (status) {
					return status >= 200 && status < 600; // Test for errors on module level, don't error on code !== 200
				}
			})
			
			return new Response(res.status,res.statusText,res.headers,res.data)
		} catch (err) {
			throw Error(`An error occurred while sending the request:\n${err}`);
		}
	}
}

module.exports = RequestHandler;