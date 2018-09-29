const fs = require("fs")
const axios = require("axios")
const SocksProxyAgent = require('socks-proxy-agent')
const html = require("html")
const URL = require("url-parse")
const tough = require('tough-cookie');
const Cookie = tough.Cookie;


// Add cookie persistence - too bad for the hacky solution
let cookieJar = new tough.CookieJar();
//
function setCookieJar(cookieJar) {
	axios.interceptors.request.use(function (config) {
		cookieJar.getCookies(config.url, function(err, cookies) {
			config.headers.cookie = cookies.join('; ');
		});
		return config;
	});
	
	axios.interceptors.response.use(function (response) {
		if (response.headers['set-cookie'] instanceof Array) {
			cookies = response.headers['set-cookie'].forEach(function (c) {
				cookieJar.setCookie(Cookie.parse(c), response.config.url, function(err, cookie){});
			});
		}
		return response;
	});
}

// Load user agents
let userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n")

// 1337 self-explanatory arrow funcs
const getRandomUA = () => userAgents[Math.floor(Math.random() * userAgents.length)]
const getRandomTimeout = () => Math.floor(Math.random() * (8000 - 5500 + 1)) + 5500
const extractHostFromUrl = url => URL(url).host


function extractTimeoutFromHTML(htmlResponse) {
	let match = htmlResponse.match(/,\s[0-9]0{3}\);/g)
	if (match) {
		match = match[0].replace(/,|\s|\)|;/g, "")
	}
	return match;
}

function isJSChallengeInRes(htmlResponse) {
	return htmlResponse.indexOf("jschl") > -1 && htmlResponse.indexOf("DDoS protection by Cloudflare") > -1
}

function getRequestHeaders(url, userAgent) {
	let headers = {}
	headers["Host"] = extractHostFromUrl(url)
	headers["Connection"] = "keep-alive"
	headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
	headers["Accept-Encoding"] = "gzip, deflate, br"
	headers["User-Agent"] = userAgent
	
	return headers
}

function solveJSChallenge(challenge) {}

async function sendRequest(url, method=null, headers=null, userAgent=null) {
	try {
		return await axios({
			method: method || "GET",
			url: url,
			headers: headers || getRequestHeaders(url, userAgent),
			jar: cookieJar,
			withCredentials: true,
			maxRedirects: 5
		});
	} catch (err) {
		// HTTP status of 503 means the request/session might have been flagged
		return err
	}
	// HTTP status code !== 503, No JS challenge here
	throw Error(`No Javascript challenge received.`)
}


// function getPageAndSolve(url, method="GET", userAgent=undefined, headers=undefined) {
// 	userAgent = userAgent || getRandomUA();
// 	headers = headers || getRequestHeaders(url, userAgent)
// 	sendRequest(url, method, headers)
// 		.then(res => {
// 			console.log(`no JS challenge in sight. Got ${res.code} HTTP status code`)
// 		})
// 		.catch(err => {
// 			if (err.response.status === 503 && isJSChallengeInRes(err.response.data)) {
// 				console.log(`JS challenged detected for ${url}. Trying to solve`)
// 				solveJSChallenge()
			// }
		// })
// }


/*
Course of action #1: getPageAndSolve() - Facade of everything
Course of action #2: get Headers --> getPage --> isJSChallengeInRes(res) --> solveJSChallenge()
Finally ----> return Promise of (session & solved challenge) cookies or raise Error ;-)
* */

sendRequest("http://google.com")
	.then(res => {
		console.log(res)
		console.log(cookieJar)
	})
	.catch(err => {
		console.error(err)
	})
// TODO: Add Incapsula ?