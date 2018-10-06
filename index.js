const fs = require("fs");
const cheerio = require("cheerio");
const safeEval = require("safe-eval");
const RequestHandler = require("./requestHandler")


class Humanoid {
	constructor() {
		this._userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n");
		this._getRandomTimeout = () =>  Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500;
		this._parseOperator = expr => expr.slice(0, 2);
		this._requestHandler = new RequestHandler();
	}
	

/*
console.log($("input[name=jschl_vc]").val());
console.log($("input[name=pass]").val());
*/
	
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
			let expr = ans.slice(0,3);
			currResult = this._operateOnResult(operator, expr, currResult);
		}
		return currResult;
	}
	
	async sendRequest(url, method=null, headers=null) {
		await this._requestHandler.sendRequest(url, method, headers)
			.then(res => {
				return res;
			})
			.catch(err => {
				throw Error(`An error occurred:\n${err}`);
			})
	}
	
	solveJSChallenge(html) {
		let answerDeclaration, answerMutations, answer;
		let script = this._extractChallengeFromHTML(html);
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
				
				answer = this._buildAnswer(answerMutations, safeEval(answerDeclaration));
				answer = answer.toFixed(10);
			}
		} catch (err) {
			throw Error(`Could not solve or parse JavaScript challenge. Caused due to error:\n${err}`);
		}
	}
}

let humanoid = new Humanoid();
humanoid.sendRequest("https://google.com")
	.then(res => {
		console.log(res)
	})
	.catch(err => {
		console.error(err)
	})
