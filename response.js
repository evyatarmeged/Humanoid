class Response {
	constructor(status, statusText, headers, data, host, requestedUrl, origin,
	            cookies=null, isSessionChallenged=false, isChallengeSolved=false) {
		this.status = status;
		this.statusText = statusText;
		this.headers = headers;
		this.data = data;
		this.host = host;
		this.requestedUrl = requestedUrl;
		this.origin = origin;
		this.cookies = cookies; // cf session & clearance cookies
		this.isSessionChallenged = isSessionChallenged;
		this.isChallengeSolved = isChallengeSolved;
	}
}

module.exports = Response;