class Response {
	constructor(status, statusText, headers, data,  cookies=null,
	            isSessionChallenged=false, isChallengeSolved=false) {
		this.status = status;
		this.statusText = statusText;
		this.headers = headers;
		this.data = data;
		this.cookies = cookies; // cf session & clearance cookies
		this.isSessionChallenged = isSessionChallenged;
		this.isChallengeSolved = isChallengeSolved;
	}
}

module.exports = Response;