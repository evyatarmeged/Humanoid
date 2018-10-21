const fs = require("fs");
const Humanoid = require("../index");
const Response = require("../src/response");
const Solver = require("../src/solver");
const humanoidReqHandler = require("../src/humanoidReqHandler");


const testHumanoid = new Humanoid()
const testRequestHandler = new humanoidReqHandler();
const testResponse = new Response();


test("Response default values", () => {
	expect(testResponse.isChallengeSolved).toBeFalsy();
	expect(testResponse.isSessionChallenged).toBeFalsy();
	expect(testResponse.cookies).toBeNull();
})

test("Random User Agent", () => {
	expect(testRequestHandler._getRandomUA()).toEqual(expect.stringContaining("Mozilla/5.0"));
})

test("Parsing URL to object with origin/host/etc", () => {
	let url = testRequestHandler._parseUrl("http://www.google.com");
	expect(url).toHaveProperty("href");
	expect(url).toHaveProperty("origin");
	expect(url).toHaveProperty("host");
})

test("Getting configuration for HTTP GET with data", () => {
	let getConf = testRequestHandler._getConfForMethod("GET", {}, {a: 1});
	expect(getConf.qs).toEqual({a: 1});
})


test("Getting configuration for HTTP POST with data", () => {
	let postConfJSON = testRequestHandler._getConfForMethod("POST", {}, {b: 2}, "json");
	expect(postConfJSON.body).toEqual({b: 2});
	expect(postConfJSON.json).toBeTruthy();
	let postConfForm = testRequestHandler._getConfForMethod("POST", {}, {c: 3}, "form");
	expect(postConfForm.form).toEqual({c: 3});
	expect(postConfForm.json).toBeUndefined();
})

test("CloudFlare JS challenge in page", () => {
	let challengeHTML = fs.readFileSync(`${__dirname}/../page_samples/sample_challenge_page.html`);
	expect(testRequestHandler.isChallengeInResponse(challengeHTML)).toBeTruthy();
})

test("CloudFlare JS challenge not in page", () => {
	let noChallengeHTML = fs.readFileSync(`${__dirname}/../page_samples/sample_nonchallenge.html`);
	expect(testRequestHandler.isChallengeInResponse(noChallengeHTML)).toBeFalsy();
})

test("Get request headers", () => {
	let headers = testRequestHandler._getRequestHeaders("https://www.google.com");
	expect(headers).toMatchObject({
		"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Encoding": "gzip, deflate, br",
		"Connection": "keep-alive",
		"Host": expect.anything(),
		"User-Agent": expect.anything()
	})
})

test("Humanoid default values", () => {
	expect(testHumanoid.maxRetries).toBe(3);
	expect(testHumanoid.autoBypass).toBeTruthy();
})

test("Reset current max retries", () => {
	testHumanoid.currMaxRetries--;
	expect(testHumanoid.currMaxRetries).toBe(2);
	
	testHumanoid._resetCurrMaxRetries();
	expect(testHumanoid.currMaxRetries).toBe(3);
})

test("Clear cookies from jar", () => {
	let emptyJar = testHumanoid.cookieJar._jar.store.idx
	testHumanoid.cookieJar._jar.store.idx = "google.com"
	expect(emptyJar).not.toEqual(testHumanoid.cookieJar._jar.store.idx)
	
	testHumanoid.clearCookies();
	expect(emptyJar).toEqual(testHumanoid.cookieJar._jar.store.idx)
})

test("Build answer object 1", () => {
	let answerObject = testHumanoid._buildAnswerObject([1.123123, 3.123123123, 2.19283918]);
	expect(answerObject).toMatchObject({
		jschl_vc: 1.123123,
		pass: 3.123123123,
		jschl_answer: 2.19283918
	})
})

test("Build answer object 2", () => {
	let answerObject = testHumanoid._buildAnswerObject([1, 2, 3]);
	expect(answerObject).toMatchObject({
		jschl_vc: 1,
		pass: 2,
		jschl_answer: 3
	})
})

test("Extract timeout from script", () => {
	let challengeHTML = fs.readFileSync(`${__dirname}/../page_samples/sample_challenge_page.html`);
	let timeout = Solver._extractTimeoutFromScript(challengeHTML);
	expect(timeout).toBe("4000");
	expect(parseInt(timeout)).toBe(4000);
})

test("Extract input form values", () => {
	let challengeHTML = fs.readFileSync(`${__dirname}/../page_samples/sample_challenge_page.html`);
	let [a, b] = Solver._extractInputValuesFromHTML(challengeHTML);
	expect(a).not.toBeNull();
	expect(b).not.toBeNull();
})

test("Extract challenge", () => {
	let challengeHTML = fs.readFileSync(`${__dirname}/../page_samples/sample_challenge_page.html`);
	let chal = Solver._extractChallengeFromHTML(challengeHTML);
	expect([chal,chal,chal]).toEqual([
		expect.stringContaining("f.action += location.hash"),
		expect.stringContaining("var s,t,o,p,b,r,e,a,k,i,n,g,f"),
		expect.stringContaining("setTimeout(function(){")
	]);
})

// TODO: Add tests for request sending/challenge solving. Mock functions as needed