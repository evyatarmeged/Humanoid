// const fs = require("fs");
// const axios = require("axios");
// const URL = require("url-parse");
// const tough = require("tough-cookie");
// const Response = require("./response")
// const Cookie = tough.Cookie;
//
//
// // Small hack to add axios cookie support, shame it doesn't come out of the box
// // function setCookieJar(cookieJar) {
// // 	axios.interceptors.request.use(function (config) {
// // 		cookieJar.getCookies(config.url, function(err, cookies) {
// // 			config.headers.cookie = cookies.join("; ");
// // 		});
// // 		return config;
// // 	});
//
// axios.interceptors.response.use(function (response, err) {
// 	if (response.status === 503 && response.data.indexOf("jschl") > -1 && response.data.indexOf("DDoS protection by Cloudflare") > -1) {
// 		console.log("Challenged")
// 	}
// });
//
// axios.get("http://canyoupwn.me", {validateStatus: function(status) {return status >= 200 && status < 600;}})
// .then(res=> console.log(res))