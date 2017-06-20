var old_nickname = sessionStorage.nickname
var old_advanced = sessionStorage.advanced
sessionStorage.clear()

function load() {
	if (old_nickname) {
		$('#nickname').val(old_nickname)
		$('#login_btn').prop('disabled',false)
	}
	if (old_advanced) {
		$('#advanced').prop('checked',true)
	}
}

function explain(id) {
	$('#'+id).show()
}

function hideExplain(id) {
	$('#'+id).hide()
}

function showPassword() {
	$('#use_pass').hide()
	$('.password').each(function() {
		$(this).show()
	})
	$('#password').focus()
}

function login() {
	var nickname = $('#nickname').val()
	var password = $('#password').val()
	sessionStorage.nickname = nickname
	var logObj = {nickname:nickname}
	if (password) {
		sessionStorage.password = password
		logObj.password = password
	}
	if ($('#advanced').prop('checked')) {
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
				$('#login_err').text('Server rejected your request: '+response.reason)
				if (response.nickname) {
					$('#nickname').val(response.nickname)
				}
				$('#password').val('')
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
	if ($('#nickname').val()) {
		$('#login_btn').prop('disabled',false)
	} else {
		$('#login_btn').prop('disabled',true)
	}
}