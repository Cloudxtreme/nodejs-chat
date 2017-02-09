function genAnswer(message) {
	var h=''
	while(Math.random()>0.01&&h.length<100){
		h+=(Math.random()>0.5?'h':'H')
	}
	return h
}

exports.answer = genAnswer