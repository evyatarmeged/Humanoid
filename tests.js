const request = require("request-promise-native");
const tough = require("tough-cookie");
const Cookie = tough.Cookie;

let cookieJar = request.jar()

options = {
	jar: cookieJar,
	resolveWithFullResponse: true
}

async function roflol() {
	await request("http://localhost:5000/setc", options)
	console.log(cookieJar)
	cookieJar = request.jar()
	console.log(cookieJar)
	// await request("http://localhost:5000/setc", options)
}

roflol()