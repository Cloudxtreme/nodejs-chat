var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8888
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

var express = require('express')
var app = express()
var server = require('http').createServer(app)
var openpgp = require('openpgp') // use as CommonJS, AMD, ES6 module or via window.openpgp
openpgp.initWorker({ path:'openpgp.worker.js' }) // set the relative web worker path
openpgp.config.aead_protect = true // activate fast AES-GCM mode (not yet OpenPGP standard)

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

app.get('/keys/:nickname', function (req, res) {
	var nickname = req.params.nickname
	var options = {
		userIds: [{ name:nickname, email:nickname+'@example.com' }],
		numBits: 2048
	}

	openpgp.generateKey(options).then(function(key) {
		var privkey = key.privateKeyArmored // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
		var pubkey = key.publicKeyArmored   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
		res.send(JSON.stringify({pubkey:pubkey,privkey:privkey}))
	})
})

server.listen(server_port,server_ip_address,function () {
	console.log("Listening on " + server_ip_address + ", port " + server_port)
})
