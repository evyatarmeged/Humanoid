const tough = require("tough-cookie");
const querystring = require("querystring")
const Response = require("./response")
const Solver = require("./solver")
const HumanoidRequester = require("./humanoidRequester")


class Humanoid extends HumanoidRequester {
	// TODO: Implement c'tor params: autoRetry=false, maxRetries=3
	constructor(ignoreHttpErrors = true) {
		super(ignoreHttpErrors)
		this._getRandomTimeout = () => Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500;
		this.timeout = undefined;
		
		// this.autoRetry = autoRetry;
		// this.maxRetries = maxRetries;
	}
	
	isChallengeInResponse(html) {
		return html.indexOf("jschl") > -1 && html.indexOf("DDoS protection by Cloudflare") > -1;
	}
	
	_getRequestHeadersForSolution(originalURL, destinationURL) {
		let headers = super._getRequestHeaders(destinationURL);
		headers["Referer"] = originalURL;
		return headers;
	}
	
	async _asyncTimeout(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	}
	
	rotateUA() {
		super.UA = super._getRandomUA();
	}
	
	clearCookies() {
		super.cookieJar = new tough.CookieJar();
		super._patchAxios()
	}
	
	_buildAnswerObject(values) {
		let [vc, pass, answer] = [...values];
		return {
			jschl_vc: vc,
			pass: pass,
			jschl_answer: answer
		}
	}
	
	async sendRequestAndSolve(url, method=undefined, headers=undefined, ignoreNoChallenge=false) {
	}
	
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
			if (res.status === 503 && this.isChallengeInResponse(res.data)) {
				isSessionChallenged = true;
			}
			let {host, origin} = {host: parsedUrl.host, origin: parsedUrl.origin};
			return new Response(
				res.status, res.statusText, res.headers, res.data,
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
	
	async bypassJSChallenge(response) {
		let {...solution} = Solver.solveChallenge(response);
		solution.timeout = this._getRandomTimeout();
		if (![solution.vc, solution.pass, solution.answer, solution.originUrl].every(elem => !!elem)) {
			throw Error(`Failed to Extract one or more necessary values.
			Values obtained:
			vc: ${solution.vc}
			pass: ${solution.pass}
			answer${solution.answer}`)
		} else {
			let solved = false;
			await this._asyncTimeout(solution.timeout);
			let answerUrl = `${solution.originUrl}/cdn-cgi/l/chk_jschl`
			let answerObj = this._buildAnswerObject([solution.vc, solution.pass, solution.answer])
			let answerQueryString = querystring.stringify(answerObj)
			let answerHeaders = this._getRequestHeadersForSolution(solution.originUrl, answerUrl)
			// console.log("SOLUTION URL")
			// console.log(answerUrl)
			// console.log("SOLUTION HEADERS")
			// console.log(answerHeaders)
			// console.log("SOLUTION QUERYSTRING")
			// console.log(answerQueryString)
			let res = await this.sendRequest(answerUrl, answerQueryString, "GET", answerHeaders)
			return res;
		}
	}
}
	
let humanoid = new Humanoid();
(async function() {
	let response = await humanoid.sendRequest("https://canyoupwn.me")
	if (response.status === 503 && humanoid.isChallengeInResponse(response.data)) {
		let res = await humanoid.bypassJSChallenge(response)
		console.log(res)
		console.log(humanoid.cookieJar)
	}
}())



// TODO: Notice this in script tag: `f.action += location.hash` -- WTF is this ? investigate
//q
// let fs = require("fs");
// let htmlsample = fs.readFileSync("./test.html").toString();
//
// let res = new Response(503, "BAD", "cool", htmlsample, "canyoupwn.me", "https://canyoupwn.me", "https://canyoupwn.me")
// console.log(Solver.bypassJSChallenge(res));
