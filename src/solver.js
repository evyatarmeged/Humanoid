const cheerio = require("cheerio");
const safeEval = require("safe-eval");


class Solver {
	constructor() {}
	
	static _extractTimeoutFromScript(html) {
		let $ = cheerio.load(html);
		let script = $("script").html();
		let match = script.match(/,\s[0-9]0{3}\);/g);
		if (match) {
			match = match[0].replace(/,|\s|\)|;/g, "");
		}
		return match;
	}
	
	static _extractInputValuesFromHTML(html) {
		let $ = cheerio.load(html);
		return [$("input[name=jschl_vc]").val(), $("input[name=pass]").val()];
	}
	
	static _extractChallengeFromHTML(html) {
		let $ = cheerio.load(html);
		let script = $("script");
		return script.html();
	}
	
	static _operateOnResult(operator, expr, result) {
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
	
	static _buildAnswer(answerMutations, currResult) {
		for (let ans of answerMutations) {
			let operator = ans.slice(0,2);
			let expr = ans.slice(3);
			currResult = this._operateOnResult(operator, expr, currResult);
		}
		return currResult;
	}
	
	static _parseChallenge(matches) {
		// Perform the necessary parsing on both challenge parts
		let [challengeInit, challengeMutations] = [...matches];
		// Perform the necessary parsing
		challengeInit = challengeInit.replace(/[;}]/g, "");
		challengeMutations = challengeMutations
			.split(";")
			.map(s => s.match(/(.=.)?(\(\(!\+).*/g))
			.filter(s => s !== null)
			.map(s => s[0]);
		
		return [challengeInit, challengeMutations];
	}
	
	static _matchChallengeFromScript(script) {
		let testMatches = script.match(/(.=\+)?(\(\(!\+).*/g); // Match the challenge part
		if (testMatches.length === 2) {
			return testMatches;
		}
		throw Error("Failed to match JS challenge with Regular Expressions");
	}

	static solveChallenge(response) {
		let {html, host, origin} = {html: response.body, host: response.host, origin: response.origin};
		let script = this._extractChallengeFromHTML(html);
		let [vc, pass] = [...this._extractInputValuesFromHTML(html)];
		
		try {
			// Parse only the actual math challenge parts from the script tag and assign them
			let challengeMatches = this._matchChallengeFromScript(script);
			let [challengeInit, challengeMutations] = this._parseChallenge(challengeMatches);
			let answer = this._buildAnswer(challengeMutations, safeEval(challengeInit));
			answer = parseFloat(answer.toFixed(10)) + host.length;
			
			return {vc: vc, pass: pass, answer: answer, origin: origin};
		} catch (err) {
			throw Error(`Could not solve or parse JavaScript challenge. Caused due to error:\n${err}`);
		}
	}
}

module.exports = Solver;
