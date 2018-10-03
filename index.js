const fs = require("fs")
const axios = require("axios")
const cheerio = require("cheerio")
const URL = require("url-parse")
const tough = require('tough-cookie');
const Cookie = tough.Cookie;


// Adding cookie persistence to axios. Too bad for the hacky solution tbh
let cookieJar = new tough.CookieJar();

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

function javascriptChallengeInResponse(htmlResponse) {
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
		});
	} catch (err) {
		// HTTP status of 503 means the request/session might have been flagged
		return err
	}
	// HTTP status code !== 503, No JS challenge here
	throw Error(`No Javascript challenge received.`)
}

//
//
// setCookieJar(cookieJar)
// sendRequest("http://google.com")
// 	.then(res => {
// 		console.log(res.config.jar)
// 		console.log(res)
// 	})
// 	.catch(err => {
// 		console.error(err)
// 	})

// const parseJSChallengeFromScript = script =>
let cloudFlareHTML = fs.readFileSync(__dirname + "/cloudflare_js_challenge.html").toString()
let $ = cheerio.load(cloudFlareHTML)
let scriptTag = $("script").html()
let testMatches = scriptTag.match(/(.=\+)?(\(\(!\+).*/g) // Match the challenge JSFuck
// b = b.filter(s => s.match(/.=.(\(\(!\+).*/g) !== null) // .map(s => s.match(/(\(\(!\+).*/g)[0])
if (testMatches.length === 2) {
	let [resultDeclaration, resultMutation] = [...testMatches]
	console.log(resultDeclaration) // First match, no +=+ or anything of the sort
	console.log(resultMutation) // Second match, matches all possible operator combinations: +=, *=, -=, /=
	
	for (let i of resultMutation.split(";")) {
		console.log(i.match(/(.=.)?(\(\(!\+).*/g))
	}
}
// b = b.reduce(s => s.match(/(\(\(!\+).*/g))


/*
Secret CloudFlare eval below:
Token = Sum of all the additions to the Object with JSFuck along the script tag
Token.toFixed(10) - Only 10 digits after decimal
Token += host.length (No protocol or trailing slash)
Thank you Mozilla Firefox Debugger :-)
* */
