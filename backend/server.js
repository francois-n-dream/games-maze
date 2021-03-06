var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
Player = require('./js/models/player');
Room = require('./js/models/room');
Maze = require('./js/models/maze_generator');

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/assets',express.static(__dirname + '/assets'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

server.listen(process.env.PORT || 8081, function() {
  console.log('Listening on ' + server.address().port);
});

// =======================================================================================

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

// =======================================================================================

var players = {};
var rooms = {};

function getPlayerByKeyValue(key, value) {
  var player = null;
  for (var id in players) {
    if (players[id][key] && players[id][key] === value) {
      player = players[id];
      break;
    }
  }
  return player;
}

function getPlayerByUsername(username) {
  return getPlayerByKeyValue('username', username);
}

function getMatchingOpponents(player_id, limit) {
  var opponents = [];
  for (var id in players) {
    if (id === player_id) continue;
    if (opponents.length >= limit) break;
    var player = players[id];
    if (player.state === Player.State.Matching) {
      opponents.push(player);
      console.log(player.id, id);
    }
  }
  return opponents;
}

function createRoom() {
  var id = guid();
  var room = new Room(id, io);
  rooms[id] = room;
  return room;
}

function destroyRoom(id) {
  var room = rooms[id];
  room.clear();
  delete rooms[id];
}

// =======================================================================================

io.on('connection', function(socket) {

  var player = new Player(socket);
  players[socket.id] = player;

  socket.on('on_set_username', function (data) {
    if (!data || !data.username) return;
    var player = players[socket.id];
    player.username = data.username;
    player.send({
      set_username: player.username,
      client_id: player.id
    });
    player.setState(Player.State.Connected);
  });

  socket.on('on_level_completed', function (data) {
    var room = rooms[player.current_room_id];
    var maze = room.maze_handler.getMaze(++player.current_level.index);

    player.send({
      action: 'update',
      sub_action: 'next_level',
      maze: maze,
      level: player.current_level
    });

    var opponents = [];
    for (var i = 0; i < room.players.length; i++) {
      var p_id = room.players[i];
      var player_obj = getPlayerByKeyValue('id', p_id);
      opponents.push(player_obj.toJson());
    }
    room.broadcast({
      action: "update",
      sub_action: "update_opponents",
      opponents: opponents
    });
  });

  socket.on('find_game', function(data) {
    var player = players[socket.id];
    player.setState(Player.State.Matching);
    var opponents = getMatchingOpponents(player.id, 1);
    if (!opponents.length) return;
    opponents.push(player);

    var client_opponents = [];
    var level_index = 0;

    var room = createRoom();
    for (var i = 0; i < opponents.length; i++) {
      var p = opponents[i];
      room.addPlayer(p.id);
      p.joinRoom(room.id);
      p.setState(Player.State.Ingame);
      p.current_level.index = level_index;
      client_opponents.push(p.toJson());
    }

    room.maze_handler.create(5);

    room.broadcast({
      view: 'game',
      opponents: client_opponents,
      room_id: room.id,
      maze: room.maze_handler.getMaze(level_index)
    });

  });

  socket.on('disconnect', function () {
    delete players[socket.id];
  });

  // socket.broadcast.emit('key', {});

});
