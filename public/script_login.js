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
	document.querySelectorAll('.password').forEach(function(el) {
		el.removeAttribute('hidden')
	})
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
