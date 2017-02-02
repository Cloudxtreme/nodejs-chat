# Workflow

## Start
- connect to socket.io
var socket = io.connect('http://'+location.hostname+port)
- send nickname (new_client) & password 
socket.emit('new_client', {nickname:nickname,password:password})
- key
genKey()
socket.emit('pubkey',pubkey)
- get list of connected users
- send hello all
send()

## On 'message'
- select dest
- get key dest
- anwser message
- dest all (?)

## On 'new_client'
- add to list of connected users
- select dest
- get key dest
- greet new_client
- dest all (?)

## On 'client_left'
- unselect dest if dest = client_left
