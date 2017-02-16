var old_nickname = sessionStorage.nickname
var old_advanced = sessionStorage.advanced
sessionStorage.clear()

function load() {
	if (old_nickname) {
		document.querySelector('#nickname').value = old_nickname
		document.querySelector('#login_btn').removeAttribute('disabled')
	}
	if (old_advanced) {
		document.querySelector('#advanced').checked = true
	}
}

function explain(id) {
	document.querySelector('#'+id).removeAttribute('hidden')
}

function hideExplain(id) {
	document.querySelector('#'+id).setAttribute('hidden','')
}

function showPassword() {
	document.querySelector('#use_pass').setAttribute('hidden','')
	var showpassword = document.querySelectorAll('.password')
	for (var i in showpassword) {
		el = showpassword[i]
		if (typeof el.removeAttribute === "function") { 
			el.removeAttribute('hidden')
		}
	}
	document.querySelector('#password').focus()
}

function login() {
	var nickname = document.querySelector('#nickname').value
	var password = document.querySelector('#password').value
	sessionStorage.nickname = nickname
	var logObj = {nickname:nickname}
	if (password) {
		sessionStorage.password = password
		logObj.password = password
	}
	if (document.querySelector('#advanced').checked) {
		sessionStorage.advanced = true
	} else if (sessionStorage.advanced) {
		delete sessionStorage.advanced
	}
	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(this.responseText)
			console.log(response)
			if (response.logOK) {
				window.location = '/'
			} else {
				alert('Server rejected your request: '+response.reason)
				document.querySelector('#nickname').value = response.nickname
				document.querySelector('#password').value = ''
			}
		}
	}
	xhr.open('POST', '/login', true)
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
	xhr.send(JSON.stringify(logObj))
}

function pressKey(e) {
	if (e.key=='Enter') {
		login()
	}
}

function input(e) {
	if (document.querySelector('#nickname').value) {
		document.querySelector('#login_btn').removeAttribute('disabled')
	} else {
		document.querySelector('#login_btn').setAttribute('disabled','')
	}
}