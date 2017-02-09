function genAnswer(message) {
	var h=''
	while(Math.random()>0.01&&h.length<100){
		h+=(Math.random()>0.5?'h':'H')
	}
	return h
}

function greet(nickname) {
	return 'Hi '+nickname+'! Let\'s talk!'
}

exports.answer = genAnswer
exports.greet = greet