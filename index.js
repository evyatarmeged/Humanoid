const request = require("request-promise-native");
const Solver = require("./solver")
const HumanoidReqHandler = require("./humanoidReqHandler")


class Humanoid extends HumanoidReqHandler {
	// TODO: Implement c'tor params: autoRetry=false, maxRetries=3
	constructor(ignoreHttpErrors=true) {
		super(ignoreHttpErrors)
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
	
	async sendRequestAndSolve(url, method=undefined, headers=undefined, ignoreNoChallenge=false) {
	}
	
	async get(url, queryString=undefined, headers=undefined) {
	}
	
	async post(url, postBody=undefined, headers=undefined) {
	}
	
	async sendRequest(url, method=undefined, data=undefined, headers=undefined, dataType=undefined) {
		let response = await super.sendRequest(url, method, data, headers, dataType);
		if (response.statusCode === 503 && this.isChallengeInResponse(response.body)) {
			return await this._bypassJSChallenge(response);
		}
	}
	
	async _bypassJSChallenge(response) {
		let {...solution} = Solver.solveChallenge(response);
		let timeout = Solver._extractTimeoutFromScript(response.data) || this._getRandomTimeout();
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
			let responseForChal = await this.sendRequest(answerUrl, "GET", answerObj, headers)
			
		}
	}
}
	
let humanoid = new Humanoid();
humanoid.sendRequest("https://canyoupwn.me/")