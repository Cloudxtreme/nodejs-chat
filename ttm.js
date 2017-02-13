var moment = require('moment-timezone')
var fs = require('fs')

var specialNicknames = []
var knownNicknames = []
var infoNicknames = []
var tutorialPhase = []
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

/*function freqLetter(s) {
	var freq = {}
	for (var i = 0, l = s.length; i < l; i++) {
		var ss=s[i].toLowerCase()
		freq[ss]=freq[ss] || 0
		freq[ss]++
	}
	var ks=Object.keys(freq)
	var M=3
	var iM=-1
	for(var k=0;k<ks.length;++k){
		if(freq[ks[k]]>M){
			iM = k
		}
	}
}*/

function genAnswer(socket,message) {
	if (messages.filter(function (fromMess) {
			return fromMess.from != socket.nickname
		}).length==0) {
		loadMessages()
	}
	if (/(.)\1\1\1/.test(message)) {
		say(socket,genHh())
	} else {
		var used = []
		var nbMess = randMessNb()
		messages.some(function (fromMess) {
			var from = fromMess.from
			var message = fromMess.message
			if (from!=socket.nickname) {
				say(socket,message)
				used.push(fromMess)
				--nbMess
			}
			return nbMess<=0
		})
		removeMessages(used)
	}
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
	var length = Math.floor(Math.random() * 44) + 6
	while(--length>0){
		h+=(Math.random()>0.5?'h':'H')
	}
	return h
}

function greet(socket) {
	say(socket,'Hi '+socket.nickname+'!')
	say(socket,'I am talktome.')
	say(socket,'Do you need any help?')
}

function say(socket,message) {
	socket.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
}

function sayAll(socket,message) {
	socket.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
	socket.broadcast.emit('message', {nickname: 'talktome', message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
}

function phaseTutorial(nickname) {
	return tutorialPhase[nickname]
}

function finishTutorial(nickname) {
	delete tutorialPhase[nickname]
}

function didntGetAnswer(socket) {
	var didntGetIt = shuffle(['I did not understand your request.', 'I only speak English.', 'Could you be clearer?', 'I am sorry, could you rephrase that?'])
	say(socket, didntGetIt[0])
}

// send, change dest
function explainBasics(socket) {
	say(socket, 'If you send a message, it will be sent to everyone connected to the chat,')
	say(socket, 'including myself!')
	say(socket, 'To talk to someone privately, click on his/her nickname on the "Connected users" list.')
	say(socket, 'To talk to someone else, just click on his/her nickname on the "Connected users" list.')
	say(socket, 'To talk to everyone again, click on the [to X].')
}

// change nickname, login, nickname rules
function explainBasics2(socket) {
	say(socket, 'To change nickname, click on change nickname on the corresponding menu.')
	say(socket, 'Your nickname may be changed by server if:')
	say(socket, '- someone already connected has this nickname')
	say(socket, '- a user whith an account has protected this nickname by password')
	say(socket, '- this nickname cannot be used.')
	say(socket, 'If you have an account, you can login by clicking on the corresponding menu.')
}

function explainAdvanced(socket) {
	say(socket,'You, and the other users can generate a key pair.')
	say(socket,'To do so, click on the button "Generate key".')
	say(socket,'Once you have a key pair, the public key will be sent to the server.')
	say(socket,'Any message sent directly to you will now be ecrypted.')
	say(socket,'When you select someone on the "Connected users" list,')
	say(socket,'you will automatically get their public key from the server,')
	say(socket,'and any message you will send them will be encrypted.')
	say(socket,'You can check before sending a message if it will be encrypted or not')
	say(socket,'by looking at the shield next to the "Send" button.')
	say(socket,'If it is green, it is secure, if not it is not.')
	say(socket,'After sending a message, if a lock appears on the left,')
	say(socket,'it means it has been encrypted or decrypted.')
}

// admin commands, ban
function explainAdvanced2(socket) {
	say(socket,'Admin commands may be executed by admin only.')
	say(socket,'admin may "op" any user.')
	say(socket,'If you are OP, you can ban any user, except admin.')
	say(socket,'You can send /ban username to server.')
}

function followTutorial(socket, message) {
	var nickname = socket.nickname
	message = message.toLowerCase()
	var phase = phaseTutorial(nickname)
	switch (phase) {
		case 'start':
			if (message.indexOf('message')!=-1||message.indexOf('send')!=-1||message.indexOf('send to')!=-1||message.indexOf('change')!=-1) {
				explainBasics(socket)
				say(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('nickname')!=-1||message.indexOf('login')!=-1) {
				explainBasics2(socket)
				say(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('key')!=-1||message.indexOf('generate')!=-1||message.indexOf('crypt')!=-1||message.indexOf('private')!=-1) {
				explainAdvanced(socket)
				say(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('admin')!=-1||message.indexOf('command')!=-1||message.indexOf('ban')!=-1||message.indexOf('operator')!=-1) {
				explainAdvanced2(socket)
				say(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else {
				didntGetAnswer(socket)
				say(socket,'Would you like to try again reformulating your question?')
				tutorialPhase[nickname] = 'rephrase'
			}
			break
		case 'continue':
			if (message.indexOf('yes')!=-1) {
				say(socket,'Ok! Let\'s continue.')
				explainAdvanced(socket)
				say(socket,'Did you understand everything?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('no')!=-1) {
				say(socket,'Great.')
				say(socket,'Talk to me anytime!')
				socket.emit('help_end')
				finishTutorial(nickname)
			} else {
				didntGetAnswer(socket)
			}
			break
		case 'rephrase':
			if (message.indexOf('no')!=-1) {
				say(socket,'Would you like me to explain in detail how to use the chat,')
				say(socket,'or only the basics?')
				tutorialPhase[nickname] = 'tutorial'
			} else if (message.indexOf('yes')!=-1) {
				say(socket, 'What is your question?')
				tutorialPhase[socket.nickname] = 'start'
			} else {
				didntGetAnswer(socket)
			}
			break
		case 'finish':
			if (message.indexOf('yes')!=-1) {
				say(socket,'Great!')
				say(socket,'Talk to me anytime!')
				socket.emit('help_end')
				finishTutorial(nickname)
			} else if (message.indexOf('no')!=-1) {
				say(socket, 'What is your question?')
				tutorialPhase[socket.nickname] = 'start'
			} else {
				didntGetAnswer(socket)
			}
			break
		case 'tutorial':
			if (message.indexOf('yes')!=-1||message.indexOf('detail')!=-1||message.indexOf('everything')!=-1||message.indexOf('all')!=-1) {
				say(socket,'Ok! Let\'s start.')
				// send, change dest
				explainBasics(socket)
				// change nickname, login, nickname rules
				explainBasics2(socket)
				// key, message encryption
				explainAdvanced(socket)
				// admin commands, ban
				explainAdvanced2(socket)
				// finish
				say(socket,'Did you understand everything?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('no')!=-1||message.indexOf('basics')!=-1) {
				say(socket,'Let\'s go over the basics together.')
				explainBasics(socket)
				explainBasics2(socket)
				say(socket,'Do you need information about more advanced features?')
				tutorialPhase[nickname] = 'continue'
			} else {
				didntGetAnswer(socket)
			}
			break
		default:
			didntGetAnswer(socket)
			break
	}
}

function launchTutorial(socket) {
	tutorialPhase[socket.nickname] = 'start'
	say(socket, 'So '+socket.nickname+', I heard you need help!')
	say(socket, 'Do not panic, I am here.')
	say(socket, 'What is your question?')
}

function answer(socket,message) {
	var nickname = socket.nickname

	if (tutorialPhase[nickname]) {
		followTutorial(socket,message)
	} else if (knownNicknames.indexOf(nickname)==-1) {
		if (message.toLowerCase().indexOf('yes')!=-1) {
			launchTutorial(socket)
		} else {
			say(socket, 'I am learning to talk.')
			say(socket, 'The more you talk to me, the better I will be.')
			knownNicknames.push(nickname)
		}
	} else {
		genAnswer(socket,message)
	}
	//logMessage(socket.nickname,message,moment().tz("Europe/Paris").format('HH:mm'))
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
				if (message.toLowerCase().indexOf('yes')!=-1) {
					launchTutorial(socket)
				} else {
					say(socket,'To talk to me, select my name in the "Connected users" list.')
					infoNicknames.push(nickname)
				}
			} else {
				if (Math.random()<0.05) {
					react(socket,message)
				}
			}
			break
		case 'help':
			var socket = data
			launchTutorial(socket)
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
