class Response {
	constructor(statusCode, statusMessage, headers, body, host, origin, cookies=null,
	            isSessionChallenged=false, isChallengeSolved=false) {
		this.statusCode = statusCode;
		this.statusMessage = statusMessage;
		this.headers = headers;
		this.body = body;
		this.host = host;
		this.origin = origin;
		this.cookies = cookies; // cf session & clearance cookies
		this.isSessionChallenged = isSessionChallenged;
		this.isChallengeSolved = isChallengeSolved;
	}
	
	asObj() {
		let obj = {}
		for (const [key, value] of Object.entries(this)) {
			obj[key] = value;
		}
		return obj;
	}
}

module.exports = Response;