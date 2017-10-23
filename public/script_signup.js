var old_nickname = sessionStorage.nickname
sessionStorage.clear()

var emailFilter = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;

function load() {
	if (old_nickname) {
		$('#nickname').val(old_nickname)
	}
}

function signup() {
	var nickname = $('#nickname').val()
	var password = $('#password').val()
	var email = $('#email').val()
	var admin = $('#admin').is(':checked')
	sessionStorage.nickname = nickname
	var signupObj = {nickname:nickname,password:sha256(password)}

	if (email&&emailFilter.test(email)) {
		signupObj.email = email
	}
	signupObj.ask_admin = admin

	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var response = JSON.parse(this.responseText)
			console.log(response)
			if (response.signOK) {
				window.location = '/login'
			} else {
				$('#login_err').text('Server rejected your request: '+response.reason)
				if (response.nickname) {
					$('#nickname').val(response.nickname)
				}
				$('#password').val('')
			}
		}
	}
	xhr.open('POST', '/signup', true)
	xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
	xhr.send(JSON.stringify(signupObj))
}

function input(e) {
	if ($('#nickname').val()!==''&&$('#password').val()!=='') {
		$('#signup_btn').prop('disabled',false)
	} else {
		$('#signup_btn').prop('disabled',true)
	}
}