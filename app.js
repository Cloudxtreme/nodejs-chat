var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

var express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var ent = require('ent') // block HTML entities
var fs = require('fs')

app.use(express.static(__dirname + '/view'))

// load index.html on get /
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/view/index.html')
})

// load config variables on get /conf
app.get('/conf', function (req, res) {
	res.setHeader('Content-Type', 'text/json')
	res.end(JSON.stringify({server_port:server_port,server_ip_address:server_ip_address}))
})

io.sockets.on('connection', function (socket, nickname) {
	// upon nickname reception, it is stored as session variable and the other clients are informed
	socket.on('new_client', function(nickname) {
		nickname = ent.encode(nickname)
		socket.nickname = nickname
		socket.broadcast.emit('new_client', nickname)
	})

	// upon message reception, the sender's nickname is captured and retransmitted to other clients
	socket.on('message', function (message) {
		message = ent.encode(message)
		socket.broadcast.emit('message', {nickname: socket.nickname, message: message})
	})
})

server.listen(server_port,server_ip_address,function () {
	console.log("Listening on " + server_ip_address + ", port " + server_port)
})
