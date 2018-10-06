const fs = require("fs")
const axios = require("axios")
const cheerio = require("cheerio")
const URL = require("url-parse")
const tough = require('tough-cookie');
const safeEval = require("safe-eval")
const Cookie = tough.Cookie;


class Humanoid {
	constructor() {
		this.cookieJar = new tough.CookieJar();
		this.userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		this.setCookieJar(this.cookieJar);
	}
	
	// Adding cookie persistence to axios. Too bad for the hacky solution tbh
	setCookieJar(cookieJar) {
		axios.interceptors.request.use(function (config) {
			cookieJar.getCookies(config.url, function(err, cookies) {
				config.headers.cookie = cookies.join('; ');
			});
			return config;
		});
		
		axios.interceptors.response.use(function (response) {
			if (response.headers['set-cookie'] instanceof Array) {
				cookies = response.headers['set-cookie'].forEach(function (c) {
					cookieJar.setCookie(Cookie.parse(c), response.config.url, function(err, cookie){});
				});
			}
			return response;
		});
	}

	// 1337 self-explanatory arrow funcs
	getRandomUA() { return this.userAgents[Math.floor(Math.random() * this.userAgents.length)] }
	getRandomTimeout() { return Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500 }
	extractHostFromUrl = url => URL(url).host
	parseOperator = expr => expr.slice(0, 2)
	
	// noinspection JSMethodCanBeStatic
	extractChallengeFromHTML(html) {
		let $ = cheerio.load(html);
		let script = $("script");
		return script.html();
	}
	
	// noinspection JSMethodCanBeStatic
	extractTimeoutFromScript(htmlResponse) {
		let match = htmlResponse.match(/,\s[0-9]0{3}\);/g)
		if (match) {
			match = match[0].replace(/,|\s|\)|;/g, "")
		}
		return match;
	}
	
	javascriptChallengeInResponse(htmlResponse) {
		return htmlResponse.indexOf("jschl") > -1 && htmlResponse.indexOf("DDoS protection by Cloudflare") > -1
	}
	
	getRequestHeaders(url, userAgent) {
		let headers = {}
		headers["Host"] = this.extractHostFromUrl(url)
		headers["Connection"] = "keep-alive"
		headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
		headers["Accept-Encoding"] = "gzip, deflate, br"
		headers["User-Agent"] = userAgent
		
		return headers
	}
	
	
	async sendRequest(url, method=null, headers=null, userAgent=null) {
		try {
			let response = await axios({
				method: method || "GET",
				url: url,
				headers: headers || this.getRequestHeaders(url, userAgent),
				jar: this.cookieJar,
				validateStatus: function (status) {
					return status >= 200 && status < 600; // default
				}
			});
			return response
		} catch (err) {
			throw Error(`An error occurred:
			${err}`)
		}
	}
	
	// noinspection JSMethodCanBeStatic
	operateOnResult(operator, expr, result) {
		switch(operator) {
			case "+=":
				return result += safeEval(expr);
			case "*=":
				return result *= safeEval(expr);
			case "-=":
				return result -= safeEval(expr);
			case "/=":
				return result /= safeEval(expr);
			default:
				throw Error("Could not match operator. Cannot")
		}
	}
	
	buildAnswer(answerMutations, currResult) {
		for (let ans of answerMutations) {
			let operator = ans.slice(0,2);
			let expr = ans.slice(0,3);
			currResult = this.operateOnResult(operator, expr, currResult);
		}
		return currResult;
	}
	
	solveJSChallenge(html) {
		let answerDeclaration, answerMutations, answer;
		let script = this.extractChallengeFromHTML(html);
		let timeout = this.extractTimeoutFromScript(script);
		try {
			// Parse only the actual math challenge parts from the script tag and assign them
			let testMatches = script.match(/(.=\+)?(\(\(!\+).*/g); // Match the challenge part
			if (testMatches.length === 2) {
				[answerDeclaration, answerMutations] = [...testMatches];
				// Perform the necessary parsing
				answerDeclaration = answerDeclaration.replace(/[;}]/g, "");
				answerMutations = answerMutations
					.split(';')
					.map(s => s.match(/(.=.)?(\(\(!\+).*/g))
					.filter(s => s !== null)
					.map(s => s[0])
				answer = this.buildAnswer(answerMutations, safeEval(answerDeclaration));
				
				return answer.toFixed(10);
			}
		} catch (err) {
			throw Error(`Could not solve JavaScript challenge. Caused due to error:
		${err}`)
		}
	}
}

let humanoid = new Humanoid();
humanoid.sendRequest("http://google.com")
	.then(res => {
		console.log(res)
	})
	.catch(err => {
		console.error(err)
	})
