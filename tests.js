const request = require("request");


request("https://whatcms.org", function(a, b, c) {
	console.log(b.headers)
	console.log(c)
})
