// connect to socket.io
var socket = io.connect('http://localhost:8080')

// ask for nickname, send to server and display in the title
var nickname = prompt('Quel est votre nickname ?')
socket.emit('new_client', nickname)
document.title = nickname + ' - ' + document.title

// insert message in page upon reception
socket.on('message', function(data) {
	insertMessage(data.nickname, data.message)
})

// display info when a new client joins
socket.on('new_client', function(nickname) {
	$('#chat_zone').prepend('<p><em>' + nickname + ' joined in.</em> Yay.</p>')
})

// submit form, send message and diplay it on th page
$('#chat_form').submit(function () {
	var message = $('#message').val()
	// send message to others
	socket.emit('message', message)
	// display message in our page as well
	insertMessage(nickname, message)
	// empty chat zone, and set focus on it again
	$('#message').val('').focus()
	// do not send form
	return false
})    

// add a message in the page
function insertMessage(nickname, message) {
	$('#chat_zone').prepend('<p><strong>' + nickname + '</strong> ' + message + '</p>')
}
