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

if (!nickname) {
	nickname = prompt('Enter your nickname.')
	sessionStorage.nickname = nickname
} else if (sessionStorage.password) {
	password = sessionStorage.password
	document.querySelector('#login_button').setAttribute('hidden','')
}
socket.emit('new_client', {nickname:nickname,password:password})
var title=document.title
setNickname()

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
})

// insert message in page upon reception
socket.on('message', function(data) {
	document.title = data.nickname + ': new message!'
	insertMessage(data.nickname, data.message, data.time)
	nmsound.play()
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
})

// list of connected clients
socket.on('list', function(list) {
	setupList(list)
})

// list of connected clients
socket.on('refresh', function() {
	window.location = '/'
})

// submit form, send message and diplay it on th page
function send() {
	var message = $('#message').val()
	if (message!='') {
		// send message to others
		socket.emit('message', message)
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
		insertMessage(nickname, message, time, true)
		// empty chat zone, and set focus on it again
		$('#message').val('').focus()
	}
}

function pressKey(e) {
	if (e.key=='Enter') {
		send()
	}
}

// add a message in the page
function insertMessage(nickname, message, time, toself) {
	var cl = 'from_server'
	if (toself) {
		cl = 'toself'
	}
	$('#chat_zone').prepend('<p class="'+cl+'">'+time+' <strong>' + nickname + '</strong> ' + message + '</p>').linkify()
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
		res += '<li>'+nickname+'</li>'
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

function genKey(pass) {
	var options = {
		userIds: [{ name:nickname, email:nickname+'@example.com' }],
		numBits: 2048,
		passphrase: pass
	}
	openpgp.generateKey(options).then(function(key) {
		privkey = key.privateKeyArmored
		pubkey = key.publicKeyArmored
		localStorage.privkey = privkey
		localStorage.pubkey = pubkey
		socket.emit('pubkey',pubkey)
	})
}