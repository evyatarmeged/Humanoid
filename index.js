const cheerio = require("cheerio");
const safeEval = require("safe-eval");
const tough = require("tough-cookie");
const Response = require("./response")
const HumanoidRequester = require("./humanoidRequester")


class Humanoid extends HumanoidRequester {
	constructor(ignoreHttpErrors=true, autoRetry=false, maxRetries=3) {
		super(ignoreHttpErrors)
		this._getRandomTimeout = () =>  Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500;
		this.timeout = undefined;
		this.autoRetry = autoRetry;
		this.maxRetries = maxRetries;
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
	
	async sendRequestAndSolve(url, method=undefined, headers=undefined, ignoreNoChallenge=false) {}
	
	async get(url, queryString=undefined, headers=undefined) {
		return await this.sendRequest(url, queryString, "GET", headers)
	}
	
	async post(url, postBody=undefined, headers=undefined) {
		return await this.sendRequest(url, postBody, "POST", headers)
	}
	
	async sendRequest(url, data=undefined, method=undefined, headers=undefined) {
		let parsedUrl = super.parseUrl(url);
		let isSessionChallenged = false;
		try {
			let res = await super.sendRequest(url, data, method, headers);
			if (res.status === 503 && this.javascriptChallengeInResponse(res.data)) {
				isSessionChallenged = true;
			}
			let {host, origin} = {host: parsedUrl.host, origin: parsedUrl.origin};
			return new Response(
				res.status,res.statusText, res.headers, res.data,
				host, url, origin, res.config.jar, isSessionChallenged
			);
		
		} catch (err) {
			if (err.response || err.request) {
				throw Error(`Axios HTTP Error\n${err}`)
			} else {
				throw Error(err)
			}
		}
	}
	
	async sendChallengeAnswer(originUrl, vc, pass, answer) {
		let solved = false;
		let destUrl = `${originUrl}/cdn-cgi/l/chk_jschl?jschl_vc=${vc}&pass=${pass}&jschl_answer=${answer}`;
		let res = await this.get(destUrl);
		if (res.status === 200) {
			solved = true;
		} else {
			if (res === 503 && this.autoRetry) {
				return await this.solveJSChallenge(res);
			}
		}
		res.isChallengeSolved = solved;
		return res;
	}
	
	async asyncTimeout(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	}
	
	async solveJSChallenge(response) {
		let {html, origin} = {html: response.data, origin: response.origin};
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
				answerValue = parseFloat(answerValue.toFixed(10)) + response.origin.length
				// Wait the necessary timeout
				await this.asyncTimeout(timeout);
				// Send the solution with the designated values
				return await this.sendChallengeAnswer(origin, vc, pass, answerValue)
			}
		} catch (err) {
			throw Error(`Could not solve or parse JavaScript challenge. Caused due to error:\n${err}`);
		}
		throw Error("Failed to match JS challenge with Regular Expressions")
	}
}

let humanoid = new Humanoid();
humanoid.sendRequest("https://canyoupwn.me")
	.then(res => {
		console.log(`Initial Response:\n`, res)
		if (res.isSessionChallenged) {
			humanoid.solveJSChallenge(res)
				.then(res => {
					console.log(res)
				})
		}
	})
	.catch(err=>console.error(err))
