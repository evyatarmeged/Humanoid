class Response {
	constructor(status, statusText, headers, data,  isChallenged=false, isChallengeSolved=false) {
		this.status = status;
		this.statusText = statusText;
		this.headers = headers;
		this.data = data;
		this.isChallenged = isChallenged;
		this.isChallengeSolved = isChallengeSolved;
		this.cookies = null; // cf session & clearance cookies
	}
}

module.exports = Response;