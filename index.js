const request = require("request-promise-native");
const Solver = require("./src/solver");
const HumanoidReqHandler = require("./src/humanoidReqHandler");


class Humanoid extends HumanoidReqHandler {
	constructor(autoBypass=true, maxRetries=3) {
		super()
		this._getRandomTimeout = () => Math.floor(Math.random() * (7000 - 5000 + 1)) + 5000;
		this.autoBypass = autoBypass;
		this.maxRetries = maxRetries;
		this.currMaxRetries = maxRetries;
		this._resetCurrMaxRetries = () => this.currMaxRetries = this.maxRetries;
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
	
	async get(url, queryString=undefined, headers=undefined) {
		return await this.sendRequest(url, "GET", queryString, headers)
	}
	
	async post(url, postBody=undefined, headers=undefined, dataType=undefined) {
		return await this.sendRequest(url, "POST", postBody, headers, dataType)
	}
	
	async sendRequest(url, method=undefined, data=undefined, headers=undefined, dataType=undefined) {
		let response = await super.sendRequest(url, method, data, headers, dataType);
		if (response.isSessionChallenged) {
			if (this.autoBypass) {
				if  (--this.currMaxRetries <= 0) {
					this._resetCurrMaxRetries();
					throw Error(
						`Max retries limit reached. Cannot Solve JavaScript challenge from response:
						${JSON.stringify(response)}`
					)
				}	else {
					let challengeResponse = await this.bypassJSChallenge(response);
					// If we got a 200, mark challenge and solved and return
					challengeResponse.isChallengeSolved = challengeResponse.statusCode === 200;
					this._resetCurrMaxRetries()
					return challengeResponse;
				}
			}
		}
		this._resetCurrMaxRetries()
		return response;
	}
	
	async bypassJSChallenge(response) {
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
			
			let solvedChallengeRes = await this.get(answerUrl, answerObj, headers);
			// All requests that reached here were from a challenged session
			solvedChallengeRes.isSessionChallenged = true;
			
			return solvedChallengeRes;
		}
	}
}

module.exports = Humanoid;
