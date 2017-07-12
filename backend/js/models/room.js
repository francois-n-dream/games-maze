var Room = function(id) {
  this.id = id;
  this.players = [];
}

Room.prototype = {

  addPlayer: function(player_id) {
    this.players.push(player_id);
  },

  removePlayer: function(player_id) {
    var index = this.players.indexOf(player_id);
    this.players.splice(index, 1);
  },

  clear: function() {
    for (var i = this.players.length - 1; i >= 0; i--) {
      this.removePlayer(this.players[i]);
    }
  },

  broadcast: function(data) {
    io.sockets.in(this.id).emit('message', data);
  }

};

if (module && module.exports) {
  module.exports = Room;
}