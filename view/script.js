// connect to socket.io
var request = new XMLHttpRequest()
// false makes the request synchronous
request.open('GET', '/conf', false)
request.send()
var conf = JSON.parse(request.responseText)
var socket = io.connect('http://'+conf.server_ip_address+':'+conf.server_port)

// ask for nickname, send to server and display in the title
var nickname = prompt('Enter your nickname ?')
socket.emit('new_client', nickname)
document.title = nickname + ' - ' + document.title

// insert message in page upon reception
socket.on('message', function(data) {
	insertMessage(data.nickname, data.message)
})

// display info when a new client joins
socket.on('new_client', function(nickname) {
	$('#chat_zone').prepend('<p><em>' + nickname + ' joined in.</em></p>')
})

// submit form, send message and diplay it on th page
function send() {
	var message = $('#message').val()
	if (message!='') {
		// send message to others
		socket.emit('message', message)
		// display message in our page as well
		insertMessage(nickname, message)
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
function insertMessage(nickname, message) {
	$('#chat_zone').prepend('<p><strong>' + nickname + '</strong> ' + message + '</p>')
}
