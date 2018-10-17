const fs = require("fs");
const rpn = require("request-promise-native");
const URL = require("url-parse");
const Response = require("./response");
const brotli = require('iltorb');


class HumanoidReqHandler {
	constructor() {
		this.cookieJar = rpn.jar()
		this._userAgentList = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		this.UA = this._getRandomUA(); // Set UserAgent
		this.config = {  // Set default config values
			resolveWithFullResponse: true,
			jar: this.cookieJar,
			simple: false,
			gzip: true,
			encoding: null
		}
	}
	
	_getRandomUA() {
		return this._userAgentList[Math.floor(Math.random() * this._userAgentList.length)];
	}
	
	_parseUrl(url) {
		return URL(url);
	}
	
	_getConfForMethod(method, config, data, dataType) {
		if (method === "GET") {
			config.qs = data
		} else {
			if (dataType === "form") {
				config.form = data;
			} else if (dataType === "json") {
				config.body = data;
				config.json = true;
			} else {
				throw Error(`Data types must be either "Form" or "JSON" as supported by the request npm package`)
			}
		}
		return config;
	}
	
	async _decompressBrotli(res) {
		res.body = await brotli.decompress(res.body);
		return res;
	}
	
	_getRequestHeaders(url) {
		let headers = {};
		headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
		headers["Accept-Encoding"] = "gzip, deflate, br";
		headers["Connection"] = "keep-alive";
		headers["Host"] = this._parseUrl(url).host;
		headers["User-Agent"] = this.UA;
		
		return headers;
	}
	
	async sendRequest(url, method=undefined, data=undefined, headers=undefined, dataType="form") {
		// Sanitize parameters
		let parsedURL = this._parseUrl(url);
		
		headers = headers || this._getRequestHeaders(url);
		headers["Host"] = !headers.Host ? parsedURL.host : headers["Host"];
		method = method !== undefined ? method.toUpperCase() : "GET";
		dataType = dataType.toLowerCase();
		// Build configuration
		let currConfig = {...this.config};
		currConfig.headers = headers;
		currConfig.method = method;
		currConfig = data !== undefined ? this._getConfForMethod(method, currConfig, data, dataType) : currConfig
		
		// Send the request
		let res = await rpn(url, currConfig);
		// Decompress Brotli content-type if returned (Unsupported natively by `request`)
		res = res.headers["content-encoding"] === "br" ? await this._decompressBrotli(res) : res;
		res.body = res.body.toString();
		
		
		return new Response(
			res.statusCode,
			res.statusMessage,res.headers,
			res.body, parsedURL.host,
			parsedURL.origin, this.cookieJar
		)
	}
}


module.exports = HumanoidReqHandler;
