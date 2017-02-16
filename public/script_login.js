var old_nickname = sessionStorage.nickname
var old_advanced = sessionStorage.advanced
sessionStorage.clear()

function load() {
	if (old_nickname) {
		document.querySelector('#nickname').value = old_nickname
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
		el.removeAttribute('hidden')
	}
	document.querySelector('#password').focus()
}

function login() {
	var nickname = document.querySelector('#nickname').value
	var password = document.querySelector('#password').value
	sessionStorage.nickname = nickname
	if (password) {
		sessionStorage.password = password
	}
	if (document.querySelector('#advanced').checked) {
		sessionStorage.advanced = true
	} else if (sessionStorage.advanced) {
		delete sessionStorage.advanced
	}
	window.location = '/'
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
