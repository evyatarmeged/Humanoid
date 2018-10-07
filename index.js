const fs = require("fs");
const cheerio = require("cheerio");
const safeEval = require("safe-eval");
const tough = require("tough-cookie");
const RequestHandler = require("./requestHandler")


class Humanoid {
	constructor( ignore_http_errors=true) {
		this._getRandomTimeout = () =>  Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500;
		this._parseOperator = expr => expr.slice(0, 2);
		this._requestHandler = new RequestHandler();
		
		if (!ignore_http_errors) {
			/* This is axios normal behavior, will throw an Error on anything that isn't an OK or a redirect
			with the exception of a 503 HTTP status code which is, typically, the JavaScript challenge */
			this._requestHandler.validateStatus = status => status >= 200 && status < 400 && status !== 503;
		}
	}
	
	_extractInputValuesFromHTML(html) {
		let $ = cheerio.load(html);
		return [$("input[name=jschl_vc]").val(), $("input[name=pass]").val()]
	}

	_extractChallengeFromHTML(html) {
		let $ = cheerio.load(html);
		let script = $("script");
		return script.html();
	}
	
	_extractTimeoutFromScript(htmlResponse) {
		let match = htmlResponse.match(/,\s[0-9]0{3}\);/g);
		if (match) {
			match = match[0].replace(/,|\s|\)|;/g, "");
		}
		return match;
	}
	
	javascriptChallengeInResponse(html) {
		return html.indexOf("jschl") > -1 && html.indexOf("DDoS protection by Cloudflare") > -1;
	}
	
	_operateOnResult(operator, expr, result) {
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
			throw Error("Could not match operator. Cannot");
		}
	}
	
	_buildAnswer(answerMutations, currResult) {
		for (let ans of answerMutations) {
			let operator = ans.slice(0,2);
			let expr = ans.slice(3);
			currResult = this._operateOnResult(operator, expr, currResult);
		}
		return currResult;
	}
	
	clearCookies() {
		this._requestHandler.cookieJar = new tough.CookieJar()
		this._requestHandler.setCookieJar()
	}
	
	async sendRequestAndSolve(url, method=null, headers=null) {}
	
	async get(url, headers) {
	
	}
	
	async sendRequest(url, method=null, headers=null) {
		try {
			let res = await this._requestHandler.sendRequest(url, method, headers);
			if (res.status !== 503) {
				return res;
			} else if (this.javascriptChallengeInResponse(res.data)) {
				res.isSessionChallenged = true;
				return res;
			}
		} catch (err) {
			if (err.response || err.request) {
				throw Error(`Axios HTTP Error\n${err}`)
			} else {
				throw Error(`An error occurred while sending a request to ${url}:\n${err}`)
			}
		}
	}
	
	// sendChallengeAnswer(vc, pass, answer) {
	
	// 	this._requestHandler.get({
	// 		url
	// 	})
	// }
	
	solveJSChallenge(html) {
		let answerDeclaration, answerMutations, answerValue;
		let script = this._extractChallengeFromHTML(html);
		let [vc, pass] = [...this._extractInputValuesFromHTML(html)]
		let timeout = this._extractTimeoutFromScript(script) || this._getRandomTimeout();
		
		try {
			// Parse only the actual math challenge parts from the script tag and assign them
			let testMatches = script.match(/(.=\+)?(\(\(!\+).*/g); // Match the challenge part
			if (testMatches.length === 2) {
				[answerDeclaration, answerMutations] = [...testMatches];
				// Perform the necessary parsing
				answerDeclaration = answerDeclaration.replace(/[;}]/g, "");
				answerMutations = answerMutations
					.split(";")
					.map(s => s.match(/(.=.)?(\(\(!\+).*/g))
					.filter(s => s !== null)
					.map(s => s[0])
				
				answerValue = this._buildAnswer(answerMutations, safeEval(answerDeclaration));
				answerValue = answerValue.toFixed(10);
				console.log(answerValue)
				console.log(timeout)
				console.log(html)
				
			}
		} catch (err) {
			throw Error(`Could not solve or parse JavaScript challenge. Caused due to error:\n${err}`);
		}
		throw Error("Failed to match JS challenge with Regular Expressions")
	}
}

let humanoid = new Humanoid();
// humanoid.sendRequest("https://canyoupwn.me")
// 	.then(res => {
// 		if (res.isSessionChallenged) {
// 			humanoid.solveJSChallenge(res.data)
//
// 		}
// })

humanoid._requestHandler.get("http://google.com")
	.then(res => {
		console.log(res)
	})