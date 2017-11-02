var moment = require('moment-timezone')
// Firebase init
var admin = require('firebase-admin')

admin.initializeApp({
	credential: admin.credential.cert({
		projectId: process.env.PROJECT_ID,
		clientEmail: process.env.CLIENT_EMAIL,
		privateKey: JSON.parse(process.env.PRIVATE_KEY)
	}),
	databaseURL: 'https://ttm-db.firebaseio.com'
})
// end of Firebase init
var db = admin.database()

var specialNicknames = []
var knownNicknames = []
var infoNicknames = []
var tutorialPhase = []
var messages = []
var allMessages = []

var banned = []
var refBanned = db.ref('ttm/banned')
refBanned.on('value', function(snapshot) {
	banned = snapshot.val()
}, function (errorObject) {
	console.log("The read failed: " + errorObject.code)
})

// wikipedia api
var wikiQueryUrl = 'https://fr.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=0&format=json&titles='
var request = require('request')

function extractText(text) {
	var res = text
	
	res = res.replace(/\{(.*?)\}/g,'')
	res = res.split('}').join('')
	// take only the text
	//res = res.split('}}')[res.split('}}').length-1]
	// remove ]] and '''
	res = res.split(']]').join('')
	res = res.split('\'\'\'').join('')
	// remove all text between [ and |
	res = res.replace(/\[(.*?)\|/g,'')
	// remove ]
	res = res.split('[').join('')

	return res
}

function getSentence(text) {
	var etext = extractText(text).split('.')
	var index = etext.length-2
	while (index>=0 && etext[index].indexOf('|')!=-1) {
		index--
	}
	return etext[index]
}

function answerWikiWord(word,callback) {
	var queryUrl = wikiQueryUrl+word

	request(queryUrl, function(error, response, body){
		var jbody = {}

		try {
			jbody = JSON.parse(body)
		} catch (e) {
			callback('Il y a une grosse couille dans le paté.')
		}

		if (jbody&&jbody.query&&jbody.query.pages) {
			var resPagesJSON = jbody.query.pages
			var thetext = ''
			var ok = true
			try {
				thetext = resPagesJSON[Object.keys(resPagesJSON)[0]].revisions[0]['*']
			} catch (e) {
				//callback('Il y a une grosse couille dans le paté.')
				ok = false
			}
			if (resPagesJSON["-1"]||!thetext||thetext.indexOf('{{homonymie}}\n{{Autres projets')!=-1) {
				// get another word
				callback('Je ne vois pas de quoi vous parlez, désolé.')
				ok = false
			}
			if (thetext.indexOf('#REDIRECTION')!=-1) {
				// follow redirection or get another word
				callback('Je vois de quoi vous parlez, mais pouvez-vous être plus précis ?')
				callback('Essayez par exemple de mettre le mot au singulier, ou d\'écrire le nom propre en entier.')
				ok = false
			}
			if (ok&&thetext) callback(getSentence(thetext))
		} else {
			callback('Il y a une couille dans le paté.')
		}
	})
}

function getWordFromSentence(sentence) {
	if (sentence.toLowerCase().indexOf('que pense')!=-1||(sentence.indexOf('pense')!=-1&&(sentence.indexOf('tu')!=-1)||sentence.indexOf('vous')!=-1)&&sentence.indexOf('?')!=-1) {
		var splitter = ''
		if (sentence.indexOf(' de la ')!=-1) {
			splitter = ' de la '
		} else if (sentence.indexOf(' des ')!=-1) {
			splitter = ' des '
		} else if (sentence.indexOf(' du ')!=-1) {
			splitter = ' du '
		} else if (sentence.indexOf(' de l\'')!=-1) {
			splitter = ' de l\''
		} else if (sentence.indexOf(' de ')!=-1) {
			splitter = ' de '
		} else {
			return false
		}
		if (!splitter) {
			return false
		} else {
			var tabres = sentence.split(splitter)
			tabres.splice(0,1)
			return tabres.join(splitter).split('?').join('').trim()
		}
	} else {
		return false
	}
}
// end of wikipedia api

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
	allMessages.push({from:nickname,message:message,time:time})
	var refMessages = db.ref("ttm/messages")
	refMessages.set(allMessages)
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

function banWord(word) {
	banned.push(word)
	refBanned.set(banned)
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
	var refMessages = db.ref("ttm/messages")
	refMessages.once("value", function(snapshot) {
		allMessages = snapshot.val()
		callback(snapshot.val())
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
	var nickname = socket.nickname
	if (specialNicknames.indexOf(nickname)==-1) {
		say(socket,'Hi '+socket.nickname+', nice to meet you!')
		say(socket,'I am talktome.')
		say(socket,'Do you need any help?')
	} else {
		say(socket,'Welcome back '+nickname+'!')
	}
}

function sendImage(socket,image) {
	socket.emit('image', {nickname: 'talktome', image: image, time: moment().tz("Europe/Paris").format('HH:mm')})
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
	sendImage(socket,'/img/send_all.gif')
	say(socket, 'To talk to someone privately, click on his/her nickname on the "Connected users" list.')
	sendImage(socket,'/img/send_one.gif')
	say(socket, 'To talk to someone else, just click on his/her nickname on the "Connected users" list.')
	say(socket, 'To talk to everyone again, click on the [to X].')
	sendImage(socket,'/img/one_toall.gif')
}

// change nickname, login, nickname rules
function explainBasics2(socket) {
	say(socket, 'To change nickname, click on change nickname on the corresponding menu.')
	say(socket, 'Your nickname may be changed by server if:')
	say(socket, '- someone already connected has this nickname')
	say(socket, '- a user whith an account has protected this nickname by password')
	say(socket, '- this nickname cannot be used.')
	sendImage(socket,'/img/chg_nickname.gif')
	say(socket, 'If you have an account, you can login by clicking on the corresponding menu.')
	sendImage(socket,'/img/login.gif')
}

function explainAdvanced(socket) {
	say(socket,'You, and the other users can generate a key pair.')
	say(socket,'To do so, click on the button "Generate key".')
	sendImage(socket,'/img/gen_key.gif')
	say(socket,'Once you have a key pair, the public key will be sent to the server.')
	say(socket,'Any message sent directly to you will now be ecrypted.')
	sendImage(socket,'/img/send_secure.gif')
	say(socket,'When you select someone on the "Connected users" list,')
	say(socket,'you will automatically get their public key from the server,')
	say(socket,'and any message you will send them will be encrypted.')
	say(socket,'You can check before sending a message if it will be encrypted or not')
	say(socket,'by looking at the shield next to the "Send" button.')
	say(socket,'If it is green, it is secure, if not it is not.')
	say(socket,'After sending or receiving a message, if a lock appears on the left,')
	say(socket,'it means it has been encrypted or decrypted.')
	sendImage(socket,'/img/send_secure2.gif')
}

// admin commands, ban
function explainAdvanced2(socket) {
	say(socket,'Admin commands may be executed by admin only.')
	say(socket,'admin may "op" any user.')
	say(socket,'If you are OP, you can ban any user, except admin.')
	say(socket,'You can send /ban username to server.')
	say(socket,'For exemple, to ban an user named Smith, send:')
	say(socket,'/ban Smith')
	say(socket,'If you are not OP, you will send "/ban Smith" in plain text to everyone.')
	say(socket,'If you are OP, Smith will be banned.')
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
				say(socket,'Does this answer your question?')
				tutorialPhase[nickname] = 'finish'
			} else if (message.indexOf('nickname')!=-1||message.indexOf('login')!=-1||message.indexOf('change')!=-1) {
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
			} else {
				say(socket,'Let\'s go over the basics together.')
				explainBasics(socket)
				explainBasics2(socket)
				say(socket,'Do you need information about more advanced features?')
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
	say(socket, 'So '+socket.nickname+', I heard you need help!')
	say(socket, 'Do not panic, I am here.')
	say(socket, 'What is your question?')
	socket.emit('help_start')
}

function answer(socket,message) {
	var nickname = socket.nickname

	if (tutorialPhase[nickname]) {
		followTutorial(socket,message)
	} else if (knownNicknames.indexOf(nickname)==-1&&specialNicknames.indexOf(nickname)==-1) {
		if (message.toLowerCase().indexOf('yes')!=-1) {
			launchTutorial(socket)
		} else if (message.toLowerCase().indexOf('no')!=-1) {
			say(socket,'Great.')
			say(socket,'Talk to me anytime!')
		} else {
			say(socket,'I can only speak French.')
			say(socket,'Parlez-moi en français.')
		}
		knownNicknames.push(nickname)
	} else if (message.toLowerCase().indexOf('help')!=-1||message.toLowerCase().indexOf('question')!=-1||(message.toLowerCase().indexOf('how')!=-1&&message.toLowerCase().indexOf('to')!=-1)) {
		launchTutorial(socket)
	} else {
		var log = true
		var polisson = shuffle(['Petit polisson','Canaille','Fripouille','Petit chenapan','Galopin','Sacripan'])
		var sentence = polisson[0]+', on ne dit pas "'
		var bw = 0
		banned.forEach(function (word) {
			if (message.toLowerCase().indexOf(word)!=-1) {
				if (bw<=0) {
					sentence += word
				} else {
					sentence += '", ni "' + word
				}
				log = false
				++bw
			}
		})
		if (!log) {
			sentence += '" !'
			say(socket, sentence)
		}
		if (getWordFromSentence(message)) {
			answerWikiWord(getWordFromSentence(message),function(zeanswer) {
				say(socket, zeanswer)
			})
		} else {
			genAnswer(socket,message)
		}
		
		if (log) {
			logMessage(socket.nickname,message.replace('Talktome', 'Monsieur').replace('talktome', 'monsieur').replace('ttm', 'mec'),moment().tz("Europe/Paris").format('HH:mm'))
		}
	}
}

function react(socket, message) {
	var nickname = socket.nickname
	var reactions = shuffle(['I agree with you, '+nickname+'.','It\'s true!','I think so.',nickname+' is right.','I must disagree here, '+nickname+'.'])
	var question = shuffle(['I do not know.','I am just a machine.','Well, '+nickname+', let me see...'])
	var mentioned = shuffle(['My name is talktome, but you can call me ttm.','It\'s me, talktome!','Yes '+nickname+', it is my name','Yes, '+nickname+'?'])
	if (message.indexOf('?')!=-1) {
		sayAll(socket,question[0])
		if (Math.random()>0.5) {
			sayAll(socket,reactions[0])
		}
	} else {
		if (message.indexOf('ttm')!=-1 || message.indexOf('talktome')!=-1) {
			sayAll(socket,mentioned[0])
		} else {
			sayAll(socket,reactions[0])
		}
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
					say(socket,'Great.')
					say(socket,'Talk to me anytime!')
				} else {
					say(socket,'To talk to me, select my name in the "Connected users" list.')
					infoNicknames.push(nickname)
				}
			} else {
				if (Math.random()<0.05 || message.indexOf('ttm')!=-1 || message.indexOf('talktome')!=-1) {
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
exports.sendImage = sendImage

exports.sns = setSNS
exports.notify = receive
exports.getMessages = getMessages
exports.loadMessages = loadMessages

exports.banWord = banWord
exports.db = db
