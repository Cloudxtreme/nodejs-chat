var moment = require('moment-timezone')
var fs = require('fs')
// secure ttm
var openpgp = require('openpgp') // use as CommonJS, AMD, ES6 module or via window.openpgp
openpgp.initWorker({ path:'openpgp.worker.js' }) // set the relative web worker path
openpgp.config.aead_protect = true // activate fast AES-GCM mode (not yet OpenPGP standard)
var privkey
var pubkey

var ttm_nickname = 'talktome'
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

if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0
		return this.indexOf(searchString, position) === position
	}
}

function genKey() {
	var nickname = 'talktome'
	var options = {
		userIds: [{ name:nickname, email:nickname+'@example.com' }],
		numBits: 2048
	}

	openpgp.generateKey(options).then(function(key) {
		var privkey = key.privateKeyArmored
		var pubkey = key.publicKeyArmored
	})
}

function encryptSay(socket,message) {
	var options = {
		data: message,
		publicKeys: openpgp.key.readArmored(socket.pubkey).keys  // for encryption
		//privateKeys: openpgp.key.readArmored(privkey).keys // for signing (optional)
	}

	openpgp.encrypt(options).then(function(ciphertext) {
		var encrypted = ciphertext.data
		say(socket,encrypted)
	})
}

genKey()

function decrypt(data) {
	var encrypted = data.message
	options = {
		message: openpgp.message.readArmored(encrypted),     // parse armored message
		//publicKeys: openpgp.key.readArmored(dest.pubkey).keys,    // for verification (optional)
		privateKey: openpgp.key.readArmored(privkey).keys[0] // for decryption
	}

	openpgp.decrypt(options).then(function(plaintext) {
		data.message = plaintext.data
	})
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
		saySecure(socket,genHh())
	} else {
		var used = []
		var nbMess = randMessNb()
		messages.some(function (fromMess) {
			var from = fromMess.from
			var message = fromMess.message
			if (from!=socket.nickname) {
				saySecure(socket,message)
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
	saySecure(socket,'Hi '+socket.nickname+'!')
	saySecure(socket,'I am talktome.')
	saySecure(socket,'Do you need any help?')
}

function sendImage(socket,image) {
	socket.emit('image', {nickname: 'talktome', image: image, time: moment().tz("Europe/Paris").format('HH:mm')})
}

function saySecure(socket,message) {
	var pubkey = socket.pubkey
	if (pubkey&&pubkey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
		encryptSay(socket,message)
	} else {
		say(socket,message)
	}
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
	saySecure(socket, didntGetIt[0])
}

// send, change dest
function explainBasics(socket) {
	saySecure(socket, 'If you send a message, it will be sent to everyone connected to the chat,')
	saySecure(socket, 'including myself!')
	sendImage(socket,'/img/send_all.gif')
	saySecure(socket, 'To talk to someone privately, click on his/her nickname on the "Connected users" list.')
	sendImage(socket,'/img/send_one.gif')
	saySecure(socket, 'To talk to someone else, just click on his/her nickname on the "Connected users" list.')
	saySecure(socket, 'To talk to everyone again, click on the [to X].')
	sendImage(socket,'/img/one_toall.gif')
}

// change nickname, login, nickname rules
function explainBasics2(socket) {
	saySecure(socket, 'To change nickname, click on change nickname on the corresponding menu.')
	saySecure(socket, 'Your nickname may be changed by server if:')
	saySecure(socket, '- someone already connected has this nickname')
	saySecure(socket, '- a user whith an account has protected this nickname by password')
	saySecure(socket, '- this nickname cannot be used.')
	sendImage(socket,'/img/chg_nickname.gif')
	saySecure(socket, 'If you have an account, you can login by clicking on the corresponding menu.')
	sendImage(socket,'/img/login.gif')
}

function explainAdvanced(socket) {
	saySecure(socket,'You, and the other users can generate a key pair.')
	saySecure(socket,'To do so, click on the button "Generate key".')
	sendImage(socket,'/img/gen_key.gif')
	saySecure(socket,'Once you have a key pair, the public key will be sent to the server.')
	saySecure(socket,'Any message sent directly to you will now be ecrypted.')
	sendImage(socket,'/img/send_secure.gif')
	saySecure(socket,'When you select someone on the "Connected users" list,')
	saySecure(socket,'you will automatically get their public key from the server,')
	saySecure(socket,'and any message you will send them will be encrypted.')
	saySecure(socket,'You can check before sending a message if it will be encrypted or not')
	saySecure(socket,'by looking at the shield next to the "Send" button.')
	saySecure(socket,'If it is green, it is secure, if not it is not.')
	saySecure(socket,'After sending or receiving a message, if a lock appears on the left,')
	saySecure(socket,'it means it has been encrypted or decrypted.')
	sendImage(socket,'/img/send_secure2.gif')
}

// admin commands, ban
function explainAdvanced2(socket) {
	saySecure(socket,'Admin commands may be executed by admin only.')
	saySecure(socket,'admin may "op" any user.')
	saySecure(socket,'If you are OP, you can ban any user, except admin.')
	saySecure(socket,'You can send /ban username to server.')
	saySecure(socket,'For exemple, to ban an user named Smith, send:')
	saySecure(socket,'/ban Smith')
	saySecure(socket,'If you are not OP, you will send "/ban Smith" in plain text to everyone.')
	saySecure(socket,'If you are OP, Smith will be banned.')
	sendImage(socket,'/img/ban_demo.gif')
}

function followTutorial(socket, message) {
	var nickname = socket.nickname
	message = message.toLowerCase()
	var phase = phaseTutorial(nickname)
	switch (phase) {
		case 'start':
			if (message.indexOf('message')!=-1||message.indexOf('send')!=-1||message.indexOf('send to')!=-1) {
				explainBasics(socket)
				saySecure(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('nickname')!=-1||message.indexOf('login')!=-1||message.indexOf('change')!=-1) {
				explainBasics2(socket)
				saySecure(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('key')!=-1||message.indexOf('generate')!=-1||message.indexOf('crypt')!=-1||message.indexOf('private')!=-1) {
				explainAdvanced(socket)
				saySecure(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('admin')!=-1||message.indexOf('command')!=-1||message.indexOf('ban')!=-1||message.indexOf('operator')!=-1) {
				explainAdvanced2(socket)
				saySecure(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else {
				didntGetAnswer(socket)
				saySecure(socket,'Would you like to try again reformulating your question?')
				tutorialPhase[nickname] = 'rephrase'
			}
			break
		case 'continue':
			if (message.indexOf('yes')!=-1) {
				saySecure(socket,'Ok! Let\'s continue.')
				explainAdvanced(socket)
				saySecure(socket,'Did you understand everything?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('no')!=-1) {
				saySecure(socket,'Great.')
				saySecure(socket,'Talk to me anytime!')
				socket.emit('help_end')
				finishTutorial(nickname)
			} else {
				didntGetAnswer(socket)
			}
			break
		case 'rephrase':
			if (message.indexOf('no')!=-1) {
				saySecure(socket,'Would you like me to explain in detail how to use the chat,')
				saySecure(socket,'or only the basics?')
				tutorialPhase[nickname] = 'tutorial'
			} else if (message.indexOf('yes')!=-1) {
				saySecure(socket, 'What is your question?')
				tutorialPhase[socket.nickname] = 'start'
			} else {
				didntGetAnswer(socket)
			}
			break
		case 'finish':
			if (message.indexOf('yes')!=-1) {
				saySecure(socket,'Great!')
				saySecure(socket,'Talk to me anytime!')
				socket.emit('help_end')
				finishTutorial(nickname)
			} else if (message.indexOf('no')!=-1) {
				saySecure(socket, 'What is your question?')
				tutorialPhase[socket.nickname] = 'start'
			} else {
				didntGetAnswer(socket)
			}
			break
		case 'tutorial':
			if (message.indexOf('yes')!=-1||message.indexOf('detail')!=-1||message.indexOf('everything')!=-1||message.indexOf('all')!=-1) {
				saySecure(socket,'Ok! Let\'s start.')
				// send, change dest
				explainBasics(socket)
				// change nickname, login, nickname rules
				explainBasics2(socket)
				// key, message encryption
				explainAdvanced(socket)
				// admin commands, ban
				explainAdvanced2(socket)
				// finish
				saySecure(socket,'Did you understand everything?')
				tutorialPhase[nickname] = 'finish'
			} else {
				saySecure(socket,'Let\'s go over the basics together.')
				explainBasics(socket)
				explainBasics2(socket)
				saySecure(socket,'Do you need information about more advanced features?')
				tutorialPhase[nickname] = 'continue'
			}
			break
		default:
			didntGetAnswer(socket)
			break
	}
}

function launchTutorial(socket) {
	tutorialPhase[socket.nickname] = 'start'
	saySecure(socket, 'So '+socket.nickname+', I heard you need help!')
	saySecure(socket, 'Do not panic, I am here.')
	saySecure(socket, 'What is your question?')
	socket.emit('help_start')
}

function answer(socket,message) {
	var nickname = socket.nickname

	if (tutorialPhase[nickname]) {
		followTutorial(socket,message)
	} else if (knownNicknames.indexOf(nickname)==-1) {
		if (message.toLowerCase().indexOf('yes')!=-1) {
			launchTutorial(socket)
		} else if (message.toLowerCase().indexOf('no')!=-1) {
			saySecure(socket,'Great.')
			saySecure(socket,'Talk to me anytime!')
		} else {
			saySecure(socket, 'I am learning to talk.')
			saySecure(socket, 'The more you talk to me, the better I will be.')
		}
		knownNicknames.push(nickname)
	} else if (message.toLowerCase().indexOf('help')!=-1||message.toLowerCase().indexOf('question')!=-1||(message.toLowerCase().indexOf('how')!=-1&&message.toLowerCase().indexOf('to')!=-1)) {
		launchTutorial(socket)
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
			delete tutorialPhase[nickname]
			break
		case 'new_client':
			var socket = data
			loadMessages()
			greet(socket)
			break
		case 'message':
			var socket = data.socket
			var nickname = socket.nickname
			var message = data.message
			if (knownNicknames.indexOf(nickname)==-1&&infoNicknames.indexOf(nickname)==-1) {
				if (message.toLowerCase().indexOf('yes')!=-1) {
					launchTutorial(socket)
				} else if (message.toLowerCase().indexOf('no')!=-1) {
					saySecure(socket,'Great.')
					saySecure(socket,'Talk to me anytime!')
				} else {
					saySecure(socket,'To talk to me, select my name in the "Connected users" list.')
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
exports.saySecure = saySecure
exports.sayAll = sayAll
exports.sendImage = sendImage

exports.sns = setSNS
exports.notify = receive
exports.getMessages = getMessages
exports.loadMessages = loadMessages
exports.pubkey = function() {
	return pubkey
}
exports.name = function() {
	return ttm_nickname
}
