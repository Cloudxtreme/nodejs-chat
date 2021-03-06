var server_port = process.env.PORT || 8080

var express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var ent = require('ent') // block HTML entities
var fs = require('fs')
var moment = require('moment-timezone')
var bodyParser = require('body-parser')
var ttm = require('./ttm')
var db = ttm.db

var allClients = []
var specialNicknames = [{name:'levg34',password:'7ed3e5c7d26ff0a023b2ce41de86d14b097e7474ce592d15eebbf5e955d3e889'},{name:'madblade',password:'318bcac3006722cdf32b1f13c1b0c57c97f8b399a6ed6af9c876e8d7041eda52'},{name:'BorisG7',password:'1afea2ea8c8b0418a7be27b90a4b08891039293edb749bb6c58dd4f4cd371afa'},{name:'Remy',password:'3983034f548c953fba1d793b24d3256e7beb19d8510c17365cc28112825189cb'},{name:'admin',password:'7ed3e5c7d26ff0a023b2ce41de86d14b097e7474ce592d15eebbf5e955d3e889'},{name:'all',locked:true},{name:'server',locked:true},{name:'talktome',locked:true},{name:'undefined',locked:true},{name:'null',locked:true}]
var sns = specialNicknames.map(function (d) {
	return d.name
})
ttm.sns(sns)
var admins = ['admin','levg34','madblade']
var ops = []
var tokens = []
var adminTokens = []

var ref = db.ref('users')
ref.on("value", function(snapshot) {
	var object = snapshot.val()
	specialNicknames = []
	admins = []
	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			specialNicknames.push(object[property])
		}
	}
	sns = specialNicknames.map(function (d) {
		return d.nickname
	})
	ttm.sns(sns)
	specialNicknames.forEach(function(no) {
		if (no.admin) {
			admins.push(no.nickname)
		}
	})
}, function (errorObject) {
	console.log("The read failed: " + errorObject.code)
})

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())

app.use(function (req, res, next) {
    //res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9000')
    res.setHeader('Access-Control-Allow-Origin', 'http://uploader-levg34.herokuapp.com')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
    res.setHeader('Access-Control-Allow-Headers', 'X-Auth-Token,content-type')
    //res.setHeader('Access-Control-Allow-Credentials', true);
    next()
})

// load index.html on get /
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/view/index.html')
})

// load login.html on get /login
app.get('/login', function (req, res) {
	res.sendFile(__dirname + '/view/login.html')
})

app.get('/signup', function (req, res) {
	res.sendFile(__dirname + '/view/signup.html')
})

app.post('/signup', function (req, res) {
	var resObject = {}
	var body = req.body
	var nickname = body.nickname
	var password = body.password
	var email = body.email
	var admin = body.ask_admin
	var check = true
	var reason = ''
	if (!nickname) {
		nickname=''
		check = false
		reason += 'Nickname required. '
	}
	if (!password) {
		password=''
		check = false
		reason += 'Password required. '
	}
	if (sns.indexOf(nickname)!=-1) {
		check = false
		reason += 'Nickname '+nickname+' already exists, please choose another one. '
		resObject.nickname = true
	}
	if (check) {
		if (email) {
			db.ref("users").push({nickname: nickname,password: password,email: email,ask_admin: admin})
		} else {
			db.ref("users").push({nickname: nickname,password: password,ask_admin: admin})
		}
	} else {
		resObject.reason = reason
	}
	resObject.signOK = check
	res.json(resObject)
})

app.post('/login', function (req, res) {
	var resObject = {}
	var body = req.body
	var nickname = body.nickname
	var password = body.password
	var logOK = true
	resObject.reason = ''
	var old_nickname = nickname
	if (!nickname) {
		nickname=''
	}
	if (nickname != ent.encode(nickname)) {
		nickname = ent.encode(nickname)
		resObject.reason += 'Nickname contains HTML entities. '
	}
	if (nickname.indexOf(' ')!=-1) {
		nickname=nickname.split(' ')[nickname.split(' ').length-1]
		resObject.reason += 'Nickname contains whitespaces. '
	}
	//nickname=nickname.replace(/[^A-Za-z0-9\u00C0-\u017F]/g, '')
	if (nickname.length>15) {
		nickname = nickname.substr(nickname.length-15)
		resObject.reason += 'Nickname too long. '
	}
	if (password) {
		var index = sns.indexOf(nickname)
		logOK = !(index==-1||(specialNicknames[index].locked||specialNicknames[index].password!=password))
		if (!logOK) {
			//nickname = 'client-'+allClients.length
			resObject.reason = 'Wrong password. '
		}
	} else if (sns.indexOf(nickname)!=-1) {
		logOK = false
		//nickname = 'client-'+allClients.length
		resObject.reason = 'Need password. '
	}
	if (alreadyUsed(nickname)) {
		nickname=nickname+'-'+allClients.length
		resObject.reason += 'Nickname already used. '
	}
	if (old_nickname!=nickname) {
		logOK=false
		resObject.nickname = nickname
	}
	resObject.logOK = logOK
	res.json(resObject)
})

// load config variables on get /conf
app.get('/conf', function (req, res) {
	res.setHeader('Content-Type', 'text/json')
	res.end(JSON.stringify({server_port:server_port}))
})

app.post('/emit', function (req, res) {
	var resObject = {ok:false}
	var body = req.body
	var nickname = body.nickname
	var event = body.event
	var params = body.params
	var token = req.get('X-Auth-Token')
	var socket = findSocket(nickname)
	var indexToken = tokens.map(function(t) { return t.token }).indexOf(token)
	var indexAdminToken = adminTokens.indexOf(token)
	var status = 0
	if (!token||(indexAdminToken==-1&&indexToken==-1)) {
		resObject.error = 'Unauthorized: need token.'
		status = 401
	} else if (indexAdminToken==-1&&tokens[indexToken].nickname!=nickname) {
		resObject.error = 'Forbidden: identity theft.'
		status = 403
	} else if (allClients.length<=0) {
		resObject.error = 'No connected client.'
		status = 412
	} else if (!event) {
		resObject.error = 'Need event.'
		status = 400
	} else if (indexAdminToken==-1&&event!='send_url') {
		resObject.error = 'Forbidden.'
		status = 403
	} else if (socket) {
		socket.emit(event, params)
		resObject.ok = true
	} else if (nickname=='all') {
		socket = allClients[0]
		socket.emit(event, params)
		socket.broadcast.emit(event, params)
		resObject.ok = true
	} else {
		resObject.error = 'No client with nickname '+nickname+' connected.'
		status = 412
	}
	// delete token if exists
	if (resObject.ok) {
		status = 200
		if (indexToken!=-1) {
			resObject.token = {token:tokens[indexToken].token,bearer:tokens[indexToken].nickname}
			tokens.splice(indexToken, 1)
		} else if (indexAdminToken!=-1) {
			resObject.token = {token:adminTokens[indexAdminToken],bearer:'admin'}
			adminTokens.splice(indexAdminToken, 1)
		} else {
			resObject.error = 'Could not invalidate token'
			status = 500
		}
	}
	res.setHeader('Content-Type', 'text/json')
	res.status(status).json(resObject)
})

function alreadyUsed(nickname) {
	var res = false
	allClients.forEach(function(socket) {
		if (socket.nickname==nickname) {
			res = true
		}
	})
	return res
}

function sendConnectedList(socket) {
	var list = []
	allClients.forEach(function (socket) {
		var pubkey = socket.pubkey
		if (pubkey&&pubkey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
			list.push({nickname: socket.nickname, pubkey: pubkey})
		} else {
			list.push({nickname: socket.nickname})
		}
	})
	list.push({nickname: 'talktome'})
	socket.emit('list', list)
}

function findSocket(nickname) {
	var index = allClients.map(function(socket){
		return socket.nickname
	}).indexOf(nickname)
	return allClients[index]
}

function generateToken() {
	function rand() {
		return Math.random().toString(36).substr(2) // remove `0.`
	}
    return rand() + rand()
}

function ban(user) {
	var socket = findSocket(user)
	if (!socket) {
		return 'no socket corresponding to '+user+' found.'
	} else if (admins.indexOf(user)!=-1) {
		return 'cannot ban admin!'
	} else {
		socket.disconnect()
		return 'user '+user+' banned.'
	}
}

function say(params) {
	var from = params.shift()
	var to = params.pop()
	var message = params.join(' ')
	var socket = findSocket(from)
	if (!socket) {
		return 'no socket corresponding to '+from+' found.'
	}
	var socket_to = findSocket(to)
	if (socket_to) {
		socket.emit('message',{nickname: from, message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
		socket_to.emit('message',{nickname: from, message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
		return 'message from '+from+' sent to '+to+'.'
	} else {
		message = message+' '+to
		socket.broadcast.emit('message',{nickname: from, message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
		socket.emit('message',{nickname: from, message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
		return 'message from '+from+' sent to all.'
	}
}

function op(user) {
	if (user=='reset') {
		ops = []
		return 'list of OPs has been reset.'
	} else if (user=='get') {
		var lop
		if (ops.length==0) {
			lop = 'no OPs'
		} else {
			lop = 'list of OPs: '+ops.toString()
		}
		return lop
	} else if (ops.indexOf(user)!=-1) {
		return user + ' is already OP.'
	} else if (!findSocket(user)) {
		return 'no socket corresponding to '+user+' found.'
	} else {
		ops.push(user)
		return user + ' added to OP list.'
	}
}

function read(file, callback) {
    fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
            console.log(err)
        }
        callback(data)
    })
}

function logs(socket) {
	var log = './npm-debug.log'
	if (process.env.OPENSHIFT_NODEJS_IP) {
		log = '../../logs/nodejs.log'
	}
	read(log,function(data){
		if (data) {
			data = data.replace(/(?:\r\n|\r|\n)/g, '<br>')
		} else {
			data = 'no data.'
		}
		socket.emit('message', {nickname: 'server', message: 'server logs: <br>'+data, time: moment().tz("Europe/Paris").format('HH:mm')})
	})
}

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function printTtmMessages(socket,params) {
	if (params[0]=='reload') {
		ttm.loadMessages()
		return 'ttm messages reloaded.'
	} else if (params[0]=='ban'&&params[1]) {
		var banned = params[1]
		ttm.banWord(banned)
		return 'word '+banned+' banned.'
	} else {
		var refMessages = ttm.db.ref("ttm/messages")
		refMessages.once("value", function(snapshot) {
			var messages = snapshot.val()
			if (isNumber(params[0])&&params[0]<messages.length) {
				messages = messages.slice(Math.max(messages.length - params[0], 0))
			} else if (!params[0]) {
				messages = messages.slice(Math.max(messages.length - 20, 0))
			}
			messages.forEach(function (fromMess) {
				var from = fromMess.from
				var message = fromMess.message
				var time = fromMess.time
				socket.emit('message', {nickname: from, message: message, time: time})
			})
		})
	}
}

function img(params,socket) {
	var to = params[1]!='view'?params[1]:''
	var image = params[0]
	if (params[1]=='view'||params[2]=='view') {
		socket.emit('image', {nickname: socket.nickname, image: image, time: moment().tz("Europe/Paris").format('HH:mm')})
	}
	if (!to) {
		socket.broadcast.emit('image', {nickname: socket.nickname, image: image, time: moment().tz("Europe/Paris").format('HH:mm')})
		return 'image sent to all.'
	} else if (!findSocket(to)) {
		return 'no socket corresponding to '+to+' found.'
	} else {
		findSocket(to).emit('image', {nickname: socket.nickname, image: image, time: moment().tz("Europe/Paris").format('HH:mm')})
		return 'image sent to '+to+'.'
	}
}

function getAdminToken(socket) {
	var token = generateToken()
	adminTokens.push(token)
	return token
}

function leaveMessage(from,to,message) {
	var res = ''
	if (to=='talktome') {
		return 'talk to talktome directly!'
	} else if (!findSocket(to)) {
		ttm.leaveMessage(from,to,message)
		res = 'message: "'+message+'" will be sent to '+to+' on next connection.'
	} else {
		ttm.say(findSocket(to),'You have a message from '+from+': "'+message+'".')
		res = 'message: "'+message+'" sent to '+to+'.'
	}
	return res
}

function panic(nickname) {
	if (!findSocket(nickname)) {
		return 'no socket corresponding to '+to+' found.'
	} else {
		findSocket(nickname).emit('self_panic')
		return 'panic call successfully sent to '+nickname
	}
}

function execCommand(command,params,socket) {
	var res = ''
	switch (command) {
		case 'error':
			throw Error(res+' send by admin.')
			break
		case 'ban':
			if (params.length<1) {
				res = 'not enough parameters.'
			} else {
				res = ban(params[0])
			}
			break
		case 'say':
			if (params.length<2) {
				res = 'not enough parameters.'
			} else {
				res = say(params)
			}
			break
		case 'op':
			if (params.length<1) {
				res = 'not enough parameters.'
			} else {
				res = op(params[0])
			}
			break
		case 'logs':
			logs(socket)
			break
		case 'ttm':
			res = printTtmMessages(socket,params)
			break
		case 'img':
			if (params.length<1) {
				res = 'not enough parameters.'
			} else {
				res = img(params,socket)
			}
			break
		case 'token':
			if (params.length==1&&params[0]=='reset') {
				adminTokens = []
				res = 'admin tokens deleted.'
			} else {
				res = getAdminToken(socket)
			}
			break
		case 'message':
			if (params.length<2) {
				res = 'not enough parameters.'
			} else {
				res = leaveMessage(socket.nickname,params.shift(),params.join(' '))
			}
			break
		case 'panic':
			if (params.length<1) {
				res = 'not enough parameters.'
			} else {
				res = panic(params[0])
			}
			break
		default:
			res = 'command not found.'
	}
	return res
}

io.sockets.on('connection', function (socket, nickname) {
	// upon nickname reception, it is stored as session variable and the other clients are informed
	socket.on('new_client', function(data) {
		var nickname = data.nickname
		var password = data.password
		if (!nickname) {
			nickname=''
		}
		var old_nickname = nickname
		nickname = ent.encode(nickname)
		nickname=nickname.split(" ")[nickname.split(" ").length-1]
		//nickname=nickname.replace(/[^A-Za-z0-9\u00C0-\u017F]/g, '')
		if (nickname.length>15) {
			nickname = nickname.substr(nickname.length-15)
		}
		var index = sns.indexOf(nickname)
		var logOK = !(nickname==''||index!=-1&&(specialNicknames[index].locked||specialNicknames[index].password!=password))
		if (!logOK) {
			nickname = 'client-'+allClients.length
		}
		if (alreadyUsed(nickname)) {
			nickname=nickname+'-'+allClients.length
		}
		if (old_nickname!=nickname) {
			socket.emit('set_nickname', nickname)
		}
		socket.nickname = nickname
		socket.broadcast.emit('new_client', nickname)
		sendConnectedList(socket)
		allClients.push(socket)
		ttm.notify('new_client',socket)
	})

	// upon message reception, the sender's nickname is captured and retransmitted to other clients
	socket.on('message', function (data) {
		var message = ent.encode(data.message)
		var to = data.to
		if (!socket.nickname) {
			var ts = Math.floor(Math.random() * 1000)
			socket.nickname = 'temp-' + ts
			socket.emit('refresh')
		}
		if ((admins.indexOf(socket.nickname)>-1&&data.message.startsWith('/'))||
		(ops.indexOf(socket.nickname)>-1&&data.message.startsWith('/ban'))) {
			var tab = data.message.split(' ')
			var command = tab.shift().substring(1)
			var params = tab
			var res = execCommand(command,params,socket)
			if (res) {
				res = command+': '+res
				socket.emit('message', {nickname: 'server', message: res, time: moment().tz("Europe/Paris").format('HH:mm')})
			}
		} else if (to=='talktome') {
			ttm.answer(socket,data.message)
			socket.emit('read','talktome')
		} else if (to=='all'||!findSocket(to)) {
			socket.broadcast.emit('message', {nickname: socket.nickname, message: message, time: moment().tz("Europe/Paris").format('HH:mm')})
			ttm.notify('message',{socket:socket,message:data.message})
		} else {
			findSocket(to).emit('message', {nickname: socket.nickname, message: data.message, time: moment().tz("Europe/Paris").format('HH:mm')})
		}
	})
	
	// reception of image
	socket.on('image', function (data) {
		var image = ent.encode(data.image)
		var to = data.to
		if (!socket.nickname) {
			var ts = Math.floor(Math.random() * 1000)
			socket.nickname = 'temp-' + ts
			socket.emit('refresh')
		}
		if (to=='talktome') {
			// TODO: react to image
			ttm.answer(socket,image)
			socket.emit('read','talktome')
		} else if (to=='all'||!findSocket(to)) {
			socket.broadcast.emit('image', {nickname: socket.nickname, image: image, time: moment().tz("Europe/Paris").format('HH:mm')})
			ttm.notify('message',{socket:socket,message:image})
		} else {
			findSocket(to).emit('image', {nickname: socket.nickname, image: data.image, time: moment().tz("Europe/Paris").format('HH:mm')})
		}
	})
	
	// client disconnects
	socket.on('disconnect', function() {
		var nickname = socket.nickname
		var j = ops.indexOf(nickname)
		if (j!=-1) {
			ops.splice(j, 1)
		}
		for (var i=0;i<tokens.length;) {
			if (tokens[i].nickname==nickname) {
				tokens.splice(i, 1)
			} else {
				++i
			}
		}
		var i = allClients.indexOf(socket)
		if (allClients[i]) {
			socket.broadcast.emit('client_left', allClients[i].nickname)
			allClients.splice(i, 1)
		}
		ttm.notify('client_left',nickname)
	})

	// client sends public key
	socket.on('pubkey', function(pubkey) {
		socket.pubkey = pubkey
		socket.broadcast.emit('new_pubkey',{nickname:socket.nickname,pubkey:pubkey})
	})

	socket.on('get_pubkey', function(nickname) {
		var client_socket = findSocket(nickname)
		var pubkey = ''
		if (client_socket) {
			pubkey = client_socket.pubkey
		}
		if (pubkey&&pubkey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
			socket.emit('pubkey',pubkey)
		} else {
			socket.emit('pubkey','')
		}
	})
	
	socket.on('del_pubkey', function() {
		delete socket.pubkey
		socket.broadcast.emit('del_pubkey',socket.nickname)
	})

	socket.on('help', function () {
		ttm.notify('help',socket)
	})
	
	socket.on('typing', function (to) {
		var dest_socket = findSocket(to)
		
		if (dest_socket) {
			dest_socket.emit('typing',socket.nickname)
		} else if (to=='all') {
			socket.broadcast.emit('typing',socket.nickname)
		}
	})
	
	socket.on('afk', function (is_afk) {
		socket.broadcast.emit('afk',{who: socket.nickname,afk: is_afk})
	})
	
	socket.on('token', function() {
		var token = generateToken()
		tokens.push({nickname:socket.nickname,token:token})
		socket.emit('token',token)
	})
	
	socket.on('read', function (to) {
		var dest_socket = findSocket(to)
		
		if (dest_socket) {
			dest_socket.emit('read',socket.nickname)
		}
	})
	
	socket.on('panic', function (is_afk) {
		socket.broadcast.emit('panic',socket.nickname)
	})
})

server.listen(server_port,function () {
	console.log("Listening on port " + server_port)
})
