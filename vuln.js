const fs = require("fs")
const axios = require("axios")
const SocksProxyAgent = require('socks-proxy-agent')
const html = require("html")
const URL = require("url-parse")
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');


// Add cookie persistence - too bad for the monkey-patching tbh
axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();


// Set up Tor proxy configuration
const proxyOptions = `socks5://127.0.0.1:9050`

// Load user agents
let userAgents = fs.readFileSync(__dirname + "/ua.text").toString().split("\n")

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

function solveJavascriptChallenge() {}

function sendRequest (url, method, headers) {
	return new Promise((resolve, reject) => {
		axios({
			method: method,
			url: url,
			headers: headers,
			jar: cookieJar,
			rejectUnauthorized: false,
			withCredentials: true
		})
		.then(res => {
			resolve(res)
		})
		.catch(err => {
			reject(err)
		})
	})
}



function getPage(url, method="GET", userAgent=undefined, headers=undefined) {
	userAgent = userAgent || getRandomUA();
	headers = headers || getRequestHeaders(url, userAgent)
	sendRequest(url, method, headers)
		.then(res => {
			console.log(`no JS challenge in sight. Got ${res.code} HTTP status code`)
		})
		.catch(err => {
			if (err.response.status === 503 && isJSChallengeInRes(err.response.data)) {
				console.log(`JS challenged detected for ${url}. Trying to solve`)
				// solveJavascriptChallenge()
				
			}
		})
}

getPage("https://canyoupwn.me")

/*
Course of action #1: getPageAndSolve() - Facade of everything
Course of action #2: get Headers --> getPage --> isJSChallengeInRes(res) --> solveJSChallenge()
Finally ------> return approved session and solved challenge cookies ;-)
* */

// TODO: Add Incapsula ?