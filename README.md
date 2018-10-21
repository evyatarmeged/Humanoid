![humanoid](https://image.ibb.co/gqpJrL/humanoid.png)
# Humanoid
![Build Status](https://travis-ci.org/evyatarmeged/Humanoid.svg?branch=master)
![license](https://img.shields.io/badge/license-MIT-green.svg)
![version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)

A Node.js package to bypass WAF anti-bot JS challenges.

#### About
Humanoid is a Node.js package to solve and bypass CloudFlare (and hopefully in the future - other WAFs' as well) JavaScript anti-bot challenges.<br>
While anti-bot pages are solvable via headless browsers, they are pretty heavy and are usually considered over the top for scraping.<br>
Humanoid can solve these challenges using the Node.js runtime and present the protected HTML page.<br>
The session cookies can also be delegated to other bots to continue scraping causing them to avoid the JS challenges altogether.

#### Installation
via npm:
```
npm install --save-dev humanoid-js
```

#### Usage
Basic usage with promises:
```javascript
const Humanoid = require("humanoid-js");

let humanoid = new Humanoid();
humanoid.get("https://www.cloudflare-protected.com")
    .then(res => {
    	console.log(res.body) // <!DOCTYPE html><html lang="en">...
    })
    .catch(err => {
    	console.error(err)
    })
```
Humanoid uses auto-bypass by default. You can override it on instance creation:
```javascript
let humanoid = new Humanoid(autoBypass=false)

humanoid.get("https://canyoupwn.me")
  .then(res => {
  	if (res.isSessionChallenged) {
      humanoid.bypassJSChallenge(res)
        .then(challengeResponse => {
        	/* Note that challengeResponse.isChallengedSolved won't be set to true, you'll have to  
        	set it yourself when doing manual bypassing. */
        	console.log(challengeResponse.body) // <!DOCTYPE html><html lang="en">...
          })
		}
	})
	.catch(err => {
		console.error(err)
	})
```
`async/await` is also supported, and is the preferred way to go:
```javascript
(async function() {
  let humanoid = new Humanoid();
  let response = await humanoid.sendRequest("www.cloudflare-protected.com")
  console.log(response.body) // <!DOCTYPE html><html lang="en">...
}())
```

### TODOs
- [ ] Add command line support
    * Support a flag to return the cookie jar after challenge solved - for better integration with other tools and scrapers
    * Have an option to simply bypass and return the protected HTML
- [ ] Solve other WAFs similar anti-bot challenges
- [ ] Add tests for request sending and challenge solving

### Issues and Contributions
All anti-bot challenges are likely to change in the future. If this is the case, please open an issue explaining 
the problem - try to include the target page if possible. I'll do my best to keep the code up to date with
new challenges.<br>
Any and all contributions are welcome - and are highly appreciated.