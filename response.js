

class  Response {
	constructor(status, data, isChallenged=false, isChallengeSolved=false) {
		this.status = status;
		this.data = data;
		this.isChallenged = isChallenged;
		this.isChallengeSolved = isChallengeSolved;
	}
	
}