var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

var express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var ent = require('ent') // block HTML entities
var fs = require('fs')

var allClients = []

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

function alreadyUsed(nickname) {
	var res = false
	allClients.forEach(function(socket) {
		if (socket.nickname==nickname) {
			res = true
		}
	})
	return res
}

io.sockets.on('connection', function (socket, nickname) {
	// upon nickname reception, it is stored as session variable and the other clients are informed
	socket.on('new_client', function(nickname) {
		if (!nickname) {
			nickname=''
		}
		var old_nickname = nickname
		nickname = ent.encode(nickname)
		nickname=nickname.split(" ")[nickname.split(" ").length-1]
		if (nickname.length>15) {
			nickname = nickname.substr(nickname.length-15)
		}
		if (nickname==''||nickname=='undefined') {
			nickname = 'client-'+allClients.length
		}
		if (alreadyUsed(nickname)) {
			nickname=nickname+'-'+allClients.length
		}
		if (old_nickname!=nickname) {
			socket.emit('set_nickname', nickname)
		}
		socket.nickname = nickname
		socket.broadcast.emit('new_client', nickname)
		allClients.push(socket)
	})

	// upon message reception, the sender's nickname is captured and retransmitted to other clients
	socket.on('message', function (message) {
		message = ent.encode(message)
		socket.broadcast.emit('message', {nickname: socket.nickname, message: message})
	})
	
	// client disconnects
	socket.on('disconnect', function() {
		var i = allClients.indexOf(socket)
		if (allClients[i]) {
			socket.broadcast.emit('client_left', allClients[i].nickname)
			allClients.splice(i, 1)
		}
	})
})

server.listen(server_port,server_ip_address,function () {
	console.log("Listening on " + server_ip_address + ", port " + server_port)
})
