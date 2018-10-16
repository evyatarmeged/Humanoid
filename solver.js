const cheerio = require("cheerio");
const safeEval = require("safe-eval");


class Solver {
	constructor() {}
	
	static _extractTimeoutFromScript(html) {
		let $ = cheerio.load(html);
		let script = $("script");
		let match = script.match(/,\s[0-9]0{3}\);/g);
		if (match) {
			match = match[0].replace(/,|\s|\)|;/g, "");
		}
		return match;
	}
	
	static _extractInputValuesFromHTML(html) {
		let $ = cheerio.load(html);
		return [$("input[name=jschl_vc]").val(), $("input[name=pass]").val()]
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
			currResult = Solver._operateOnResult(operator, expr, currResult);
		}
		return currResult;
	}
	
	static solveChallenge(response) {
		// TODO: We need the length of the URL without the protocol or forward slash
		// TODO: Origin == Referer, Host == t.length to add to the answer
		let {html, host, origin} = {html: response.data, host: response.host, origin: response.origin};
		let answerDeclaration, answerMutations, answer;
		let script = Solver._extractChallengeFromHTML(html);
		let [vc, pass] = [...Solver._extractInputValuesFromHTML(html)];
		
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
				answer = Solver._buildAnswer(answerMutations, safeEval(answerDeclaration));
				answer = parseFloat(answer.toFixed(10)) + host.length;
				return {vc: vc, pass: pass, answer: answer, origin: origin}
			}
		} catch (err) {
			throw Error(`Could not solve or parse JavaScript challenge. Caused due to error:\n${err}`);
		}
		throw Error("Failed to match JS challenge with Regular Expressions")
	}
}

module.exports = Solver;