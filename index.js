const cheerio = require("cheerio");
const safeEval = require("safe-eval");
const tough = require("tough-cookie");
const Response = require("./response")
const HumanoidRequester = require("./humanoidRequester")


// TODO: Add back to class
function javascriptChallengeInResponse(html) {
	return html.indexOf("jschl") > -1 && html.indexOf("DDoS protection by Cloudflare") > -1;
}

function cfCookiesExist(){}


class Humanoid extends HumanoidRequester {
	constructor(ignoreHttpErrors=true) {
		super(ignoreHttpErrors)
		this._getRandomTimeout = () =>  Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500;
		this.timeout = null;
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
			throw Error("Could not match operator. Cannot solve JS challenge");
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
		super.cookieJar = new tough.CookieJar();
		super._patchAxios()
	}
	
	async sendRequestAndSolve(url, method=null, headers=null) {}
	
	async get(url, headers) {
		return await this.sendRequest(url, "GET", headers)
	}
	
	async post(url, postBody, headers) {
		return await super.post(url, "POST", postBody, headers)
	}
	
	async sendRequest(url, method=null, headers=null) {
		let isSessionChallenged, isChallengeSolved = false;
		try {
			let res = await super.sendRequest(url, method, headers);
			if (res.status === 503 && javascriptChallengeInResponse(res.data)) {
				isSessionChallenged = true;
			}
			return new Response(res.status, res.statusText, res.headers,res.data, res.config.jar, isSessionChallenged);
		} catch (err) {
			if (err.response || err.request) {
				throw Error(`Axios HTTP Error\n${err}`)
			} else {
				throw Error(err)
			}
		}
	}
	
	// sendChallengeAnswer(vc, pass, answer) {}
	
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
humanoid.get("http://google.com").then(res => {console.log(res)})
// TODO: Check if post request sends post data (test on Flask server)
// TODO: If true, abstract simple GET/POST methods only in Humanoid class, no need to repeat in requestHandler