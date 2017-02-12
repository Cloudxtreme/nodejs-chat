var moment = require('moment-timezone')
var fs = require('fs')

var specialNicknames = []
var knownNicknames = []
var infoNicknames = []
var filepath = './data/messages.log'
var messages = []

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex)
		currentIndex -= 1

		// And swap it with the current element.
		temporaryValue = array[currentIndex]
		array[currentIndex] = array[randomIndex]
		array[randomIndex] = temporaryValue
	}

	return array
}

function logMessage(nickname,message,time) {
	fs.appendFile(filepath, JSON.stringify({from:nickname,message:message,time:time})+'\n', function(err) {
		if(err) {
			return console.log(err)
		}
	})
}

function setSNS(sns) {
	specialNicknames=sns
}

function removeMessages(used) {
	used.forEach(function (fromMess) {
		var index = messages.indexOf(fromMess)
		if (index!=-1) {
			messages.splice(index,1)
		}
	})
}

function randMessNb() {
	var rand = Math.random()
	var nbMess = 1
	if (rand>0.45) {
		++nbMess
	}
	if (rand>0.9) {
		++nbMess
	}
	return nbMess
}

function genAnswer(socket,message) {
	if (messages.filter(function (fromMess) {
			return fromMess.from != socket.nickname
		}).length==0) {
		loadMessages()
	}
	var used = []
	var nbMess = randMessNb()
	messages.some(function (fromMess) {
		var from = fromMess.from
		var message = fromMess.message
		var time = fromMess.time
		if (from!=socket.nickname) {
			say(socket,message)
			used.push(fromMess)
			--nbMess
		}
		return nbMess<=0
	})
	removeMessages(used)
}

function loadMessages() {
	getMessages(function (_messages) {
		messages = shuffle(_messages)
	})
}

function getMessages(callback) {
	fs.readFile(filepath, 'utf-8', function (err, data) {
		if (err) {
			return console.log(err)
		}
		callback(JSON.parse('[' + data.replace(/\n/g, ",").slice(0, -1) + ']'))
	})
}

function genHh() {
	var h=''
	while(Math.random()>0.01&&h.length<100){
		h+=(Math.random()>0.5?'h':'H')
	}
	return h
}

function greet(socket) {
	say(socket,'Hi '+socket.nickname+'!')
	say(socket,'Let\'s talk!')
}

function say(socket,message) {
	socket.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
}

function sayAll(socket,message) {
	socket.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
	socket.broadcast.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
}

function answer(socket,message) {
	var nickname = socket.nickname

	if (knownNicknames.indexOf(nickname)==-1) {
		say(socket, 'I am learning to talk.')
		say(socket, 'The more you talk to me, the better I will be.')
		knownNicknames.push(nickname)
	} else {
		genAnswer(socket,message)
	}
	logMessage(socket.nickname,message,moment().tz("Europe/Paris").format('HH:mm'))
}

function react(socket, message) {
	var nickname = socket.nickname
	var reactions = shuffle(['I agree with you, '+nickname+'.','It\'s true!','I think so.',nickname+' is right.','I must disagree here, '+nickname+'.'])
	var question = shuffle(['I do not know.','I am just a machine.','Well, '+nickname+', let me see...'])
	if (message.indexOf('?')!=-1) {
		sayAll(socket,question[0])
		if (Math.random()>0.5) {
			sayAll(socket,reactions[0])
		}
	} else {
		sayAll(socket,reactions[0])
	}
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
			loadMessages()
			break
		case 'message':
			var socket = data.socket
			var nickname = socket.nickname
			var message = data.message
			if (knownNicknames.indexOf(nickname)==-1&&infoNicknames.indexOf(nickname)==-1) {
				say(socket,'To talk to me, select my name in the "Connected users" list.')
				infoNicknames.push(nickname)
			} else {
				if (Math.random()<0.05) {
					react(socket,message)
				}
			}
			break
		default:

			break
	}
}

exports.answer = answer
exports.greet = greet
exports.say = say
exports.sayAll = sayAll

exports.sns = setSNS
exports.notify = receive
exports.getMessages = getMessages
exports.loadMessages = loadMessages
