var app = require('express')()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var ent = require('ent') // block HTML entities
var fs = require('fs')

// load index.html on get /
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/view/index.html')
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

server.listen(8080)
