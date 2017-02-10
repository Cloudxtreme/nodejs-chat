var moment = require('moment-timezone')
var fs = require('fs')

var specialNicknames = []
var knownNicknames = []
var infoNicknames = []

function logMessage(nickname,message) {
	fs.appendFile('./data/messages.log', JSON.stringify({from:nickname,message:message})+'\n', function(err) {
		if(err) {
			return console.log(err)
		}
	})
}

function setSNS(sns) {
	specialNicknames=sns
}

function genAnswer() {
	var h=''
	while(Math.random()>0.01&&h.length<100){
		h+=(Math.random()>0.5?'h':'H')
	}
	return h
}

function greet(socket) {
	say(socket,'Hi '+socket.nickname+'! Let\'s talk!')
}

function say(socket,message) {
	socket.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
}

function answer(socket,message) {
	var nickname = socket.nickname
	//if (specialNicknames.indexOf(nickname)!=-1) {
	if (0) {
		say(socket, genAnswer())
	} else {
		if (knownNicknames.indexOf(nickname)==-1) {
			say(socket, 'Thank you for your message.')
			say(socket, 'I do not know how to talk yet, but I am learning!')
			knownNicknames.push(nickname)
		} else {
			say(socket, genAnswer())
		}
	}
	logMessage(socket.nickname,message)
}

function receive(event,data) {
	switch (event) {
		case 'client_left':
			var nickname = data
			var index = knownNicknames.indexOf(nickname)
			if (index!=-1) {
				knownNicknames.splice(index,1)
			}
			index = infoNicknames.indexOf(nickname)
			if (index!=-1) {
				infoNicknames.splice(index,1)
			}
			break
		case 'new_client':

			break
		case 'message':
			var socket = data.socket
			var nickname = socket.nickname
			var message = data.message
			if (knownNicknames.indexOf(nickname)==-1&&infoNicknames.indexOf(nickname)==-1) {
				say(socket,'To talk to me, select my name in the "Connected users" list.')
				infoNicknames.push(nickname)
			}
			break
		default:

			break
	}
}

exports.answer = answer
exports.greet = greet
exports.say = say

exports.sns = setSNS
exports.notify = receive