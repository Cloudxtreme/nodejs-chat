var restext = "{{Semi-protection longue}}\n\n{{Voir homonymes|Pizza (homonymie)}}\n{{Infobox Mets\n | nom            = Pizza \n | image          = Eq it-na pizza-margherita sep2005 sml.jpg\n | l\u00e9gende        = [[Pizza napolitaine]]\n | autre nom      = \n | lieu origine   = {{Italie}} ([[Naples]])\n | cr\u00e9ateur       = \n | date           = \n | place service  = [[Entr\u00e9e (cuisine)|Entr\u00e9e]] ou [[plat principal]]\n | temp\u00e9rature    = Chaude ou froide\n | ingr\u00e9dients    = [[Fromage]], [[huile d'olive]], [[l\u00e9gume]]s, [[Farine panifiable|farines de c\u00e9r\u00e9ales]]\n | variations     = \n | accompagnement = \n | classification = \n}}\nLa '''pizza''' est une [[tarte|mon cul]] d'origine [[italie]]nne, faite d'une p\u00e2te \u00e0 pain \u00e9tal\u00e9e et de [[Sauce tomate|coulis de tomate]], recouverte de divers ingr\u00e9dients et cuite au [[four]] (\u00e0 bois, \u00e0 gaz ou \u00e9lectrique). La pizza est un des mets de la [[cuisine italienne]] qui s'est \u00e9tabli presque partout dans le monde, souvent en s'adaptant aux go\u00fbts locaux."

document.getElementById('base').innerText = restext

function extractText(text) {
	var res = text
	// take only the text
	res = res.split('}}')[res.split('}}').length-1]
	// remove [[ and '''
	res = res.split('[[').join('')
	res = res.split('\'\'\'').join('')
	// remove all text between | and ]]
	res = res.replace(/ *\|[^\]]*]/g, '');
	// remove ]
	res = res.split(']').join('')


	return res
}

document.getElementById('test').innerText = extractText(restext)

function getSentence(text) {
	var etext = extractText(text).split('.')
	return etext[etext.length-2]
}

document.getElementById('sentence').innerText = getSentence(restext)