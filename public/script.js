var port = ''
if (location.hostname=='localhost') {
	if (location.port!=''&&location.port!='80')
	port=':'+location.port
} else {
	port=':8000'
}
// connect to socket.io
var socket = io.connect('http://'+location.hostname+port)

// ask for nickname, send to server and display in the title
var nickname = sessionStorage.nickname
var password = ''
var privkey = localStorage.privkey
var pubkey = localStorage.pubkey
var dest = {}
dest.name = 'all'
var usesecure = false

if (!nickname) {
	nickname = prompt('Enter your nickname.','')
	sessionStorage.nickname = nickname
} else if (sessionStorage.password) {
	password = sessionStorage.password
	document.querySelector('#login_button').setAttribute('hidden','')
}
socket.emit('new_client', {nickname:nickname,password:password})
var title=document.title
setNickname()

if (password) {
	usesecure = true
	$('.keyarea').show()
	if (privkey&&pubkey) {
		$('#key').attr('src','/img/keyok.png')
		socket.emit('pubkey',pubkey)
	}
}

var list = []

var nmsound = new Audio('./audio/new_message.mp3')
var loginsound = new Audio('./audio/signin.mp3')
var logoutsound = new Audio('./audio/signout.mp3')

// if server requests a change in the nickname
socket.on('set_nickname', function(new_nickname){
	nickname = new_nickname
	setNickname()
	messageFromServer('your nickname has been changed to <b>' + nickname + '</b> by server.')
	sessionStorage.nickname = nickname
	sessionStorage.password = ''
	$('.keyarea').hide()
})

// insert message in page upon reception
function displayMessage(data) {
	document.title = data.nickname + ': new message!'
	insertMessage(data.nickname, data.message, data.time, false, data.secured)
	nmsound.play()
}

socket.on('message', function(data) {
	if (privkey&&data.message.startsWith('-----BEGIN PGP MESSAGE-----')) {
		decrypt(data)
	} else {
		displayMessage(data)
	}
})

// display info when a new client joins
socket.on('new_client', function(nickname) {
	document.title = nickname + ': joined in.'
	messageFromServer(nickname + ' joined in.')
	addToList(nickname)
	loginsound.play()
})

// display info when a client lefts
socket.on('client_left', function(nickname) {
	document.title = nickname + ': left the chat.'
	messageFromServer(nickname + ' left the chat.')
	removeFromList(nickname)
	logoutsound.play()
	if (nickname==dest.name) {
		selectConnected('all')
	}
})

// list of connected clients
socket.on('list', function(list) {
	setupList(list)
})

// list of connected clients
socket.on('refresh', function() {
	window.location = '/'
})

// receive public key
socket.on('pubkey', function(pubkey) {
	if (pubkey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
		dest.pubkey = pubkey
		$('#send_secured').attr('src','/img/secured.png')
	} else {
		delete dest.pubkey
	}
})

function sendMessage(message) {
	// send message to others
	socket.emit('message', {message: message, to: dest.name})
	// empty chat zone, and set focus on it again
	$('#message').val('').focus()
}

// submit form, send message and diplay it on the page
function send() {
	var message = $('#message').val()
	if (message!='') {
		var secured = false
		if (dest&&dest.pubkey) {
			encrypt(message)
			secured = true
		} else {
			sendMessage(message)
		}
		// display message in our page as well
		var date = new Date()
		var hours = date.getHours()
		if (hours<10) {
			hours = '0'+hours
		}
		var minutes = date.getMinutes()
		if (minutes<10) {
			minutes = '0'+minutes
		}
		time = hours + ':' + minutes
		insertMessage(nickname, message, time, true, secured, dest.name)
	}
}

function pressKey(e) {
	if (e.key=='Enter') {
		send()
	}
}

function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// add a message in the page
function insertMessage(nickname, message, time, toself, secured, to) {
	var cl = 'from_server'
	var secimg = '/img/blanksecure.jpg'
	var totag = ''
	if (toself) {
		cl = 'toself'
		if (to&&to!='all') {
			totag = ' <em>(to '+dest.name+')</em>'	
		}
	}
	if (secured) {
		secimg = '/img/secure.jpg'
	} else if (usesecure) {
		secimg = '/img/unsecure.jpg'
	}
	$('#chat_zone').prepend('<p class="'+cl+'">'+time+' <img src="'+secimg+'" class="keyarea"> <strong>' + nickname + '</strong> ' + escapeHtml(message) + totag +'</p>').linkify()
}

function messageFromServer(message) {
	$('#chat_zone').prepend('<p class="from_server"><em>'+message+'</em></p>')
}

function setupList(new_list) {
	list = new_list
	displayList()
}

function addToList(nickname) {
	list.push(nickname)
	displayList()
}

function removeFromList(nickname) {
	var index = list.indexOf(nickname)
	if (index > -1) {
		list.splice(index, 1)
	}
	displayList()
}

function displayList() {
	res = '<h3>Connected users:</h3>'
	res += '<ul>'
	list.forEach(function (nickname) {
		res += '<li onclick="selectConnected(\''+nickname+'\')">'+nickname+'</li>'
	})
	res += '</ul>'
	$('#connected').html(res)
}

function focus() {
	document.title = nickname + ' - ' + title
}

function setNickname() {
	document.title = nickname + ' - ' + title
	document.querySelector('#nickname').innerHTML = nickname
}

function selectConnected(nickname) {
	dest = {}
	dest.name = nickname
	$('#dest').html(dest.name)
	$('#send_secured').attr('src','/img/unsecured.png')
	if (dest.name!='all') {
		socket.emit('get_pubkey',dest.name)
	}
}

function genKey() {
	//var pass = prompt('Enter your passphrase.','')
	var pass = password
	var options = {
		userIds: [{ name:nickname, email:nickname+'@example.com' }],
		numBits: 2048
	}
	openpgp.generateKey(options).then(function(key) {
		privkey = key.privateKeyArmored
		pubkey = key.publicKeyArmored
		localStorage.privkey = privkey
		localStorage.pubkey = pubkey
		window.location = '/'
	})
}

function showkey() {
	if (privkey&&pubkey) {
		alert(privkey)
	} else {
		genKey()
	}
}

function encrypt(message) {
	var options = {
		data: message,                             // input as String
		publicKeys: openpgp.key.readArmored(dest.pubkey).keys  // for encryption
		//privateKeys: openpgp.key.readArmored(privkey).keys // for signing (optional)
	}

	openpgp.encrypt(options).then(function(ciphertext) {
		var encrypted = ciphertext.data
		sendMessage(encrypted)
	})
}

function decrypt(data) {
	var encrypted = data.message
	options = {
		message: openpgp.message.readArmored(encrypted),     // parse armored message
		//publicKeys: openpgp.key.readArmored(dest.pubkey).keys,    // for verification (optional)
		privateKey: openpgp.key.readArmored(privkey).keys[0] // for decryption
	}

	openpgp.decrypt(options).then(function(plaintext) {
		data.message = plaintext.data
		data.secured = true
		displayMessage(data)
	})
}

// IE
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0
		return this.indexOf(searchString, position) === position
	}
}