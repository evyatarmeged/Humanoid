const request = require("request-promise-native");
const Solver = require("./solver")
const HumanoidReqHandler = require("./humanoidReqHandler")


class Humanoid extends HumanoidReqHandler {
	// TODO: Implement c'tor params: autoRetry=false, maxRetries=3
	constructor() {
		super()
		this._getRandomTimeout = () => Math.floor(Math.random() * (7000 - 5000 + 1)) + 5000;
		this.timeout = undefined;
		// this.autoRetry = autoRetry;
		// this.maxRetries = maxRetries;
	}
	
	isChallengeInResponse(html) {
		return html.indexOf("jschl") > -1 && html.indexOf("DDoS protection by Cloudflare") > -1;
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
		super.cookieJar = request.jar();
	}
	
	_buildAnswerObject(values) {
		let [vc, pass, answer] = [...values];
		return {
			jschl_vc: vc,
			pass: pass,
			jschl_answer: answer
		}
	}
	
	// async sendRequestAndSolve(url, method=undefined, headers=undefined, ignoreNoChallenge=false) {
	// }
	//
	async get(url, queryString=undefined, headers=undefined) {
		return await this.sendRequest(url, "GET", queryString, headers)
	}
	
	async post(url, postBody=undefined, headers=undefined, dataType=undefined) {
		return await this.sendRequest(url, "POST", postBody, headers, dataType)
	}
	
	async sendRequest(url, method=undefined, data=undefined, headers=undefined, dataType=undefined) {
		let response = await super.sendRequest(url, method, data, headers, dataType);
		console.log(`Got ${response.statusCode}`)
		if (response.statusCode === 503 && this.isChallengeInResponse(response.body)) {
			let challengeResponse = await this._bypassJSChallenge(response);
			// Session is definitely challenged
			challengeResponse.isSessionChallenged = true;
			// If we got a 200, mark challenge and solved and return
			challengeResponse.isChallengeSolved = challengeResponse.statusCode === 200;
			return challengeResponse;
		}
		return response;
	}
	
	async _bypassJSChallenge(response) {
		let {...solution} = Solver.solveChallenge(response);
		let timeout = Solver._extractTimeoutFromScript(response.body) || this._getRandomTimeout();
		if (![solution.vc, solution.pass, solution.answer, solution.origin].every(elem => !!elem)) {
			throw Error(`Failed to Extract one or more necessary values.
			Values obtained:
			vc: ${solution.vc}
			pass: ${solution.pass}
			answer${solution.answer}`)
		} else {
			// Wait the desired time;
			await this._asyncTimeout(timeout);
			let answerUrl = `${solution.origin}/cdn-cgi/l/chk_jschl`
			let answerObj = this._buildAnswerObject([solution.vc, solution.pass, solution.answer])
			let headers = super._getRequestHeaders(answerUrl);
			headers["Referer"] = response.origin;
			
			// Examine this and continue
			return await this.sendRequest(answerUrl, "GET", answerObj, headers);
		}
	}
}
	
let humanoid = new Humanoid();
humanoid.sendRequest("https://canyoupwn.me/")
	.then(res => {
		console.log(res)
	})
