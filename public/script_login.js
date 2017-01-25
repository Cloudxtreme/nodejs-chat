function login() {
	var nickname = document.querySelector('#nickname').value
	var password = document.querySelector('#password').value
	sessionStorage.nickname = nickname
	sessionStorage.password = password
	window.location = '/'
}

function pressKey(e) {
	if (e.key=='Enter') {
		login()
	}
}
