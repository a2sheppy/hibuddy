var crypto  = require('crypto');
var express = require('express');
var app = express();
var rooms = {};
var counter = 0;

app.use(express.bodyParser());
app.use('/static/lib', express.static(__dirname + '/bower_components'));
app.use('/static', express.static(__dirname + '/public'));

app.get("/", function(req, res) {
  res.sendfile('/public/index.html', {root: __dirname});
});

app.post("/rooms", function(req, res) {
  var room = req.param('room') || crypto.randomBytes(16).toString('hex');
  rooms[room] = [];
  res.redirect('/rooms/' + room);
});

app.get('/rooms/:room', function(req, res) {
  var room  = req.param('room');

  if (room in rooms)
    res.sendfile('/public/room.html', {root: __dirname});
  else
    res.status(404).sendfile('/public/404.html', {root: __dirname});
});

app.get("/rooms/:room/signalling", function(req, res) {
  var room = req.param('room');
  var users = rooms[room];
  var uid = crypto.randomBytes(16).toString('hex');
  var timer;
  console.log('new friend');

  res.writeHead(200, {
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive"
  });

  req.on("close", function() {
    var users = rooms[room];
    rooms[room] = users.filter(function(user) {
      return user.connection !== res;
    });
    clearInterval(timer);
  });

  var event = JSON.stringify({type: 'uid', uid: uid});
  res.write("event: uid\n");
  res.write("data: " + event + "\n\n");

  // we send a ping comment every n seconds to keep the connection
  // alive.
  timer = setInterval(function() {
    res.write(":p\n\n");
  }, 20000);

  users.forEach(function(user) {
    user.stream.write("event: newbuddy\n");
    user.stream.write("data: {}\n\n");
  });
  users.push({uid: uid, stream: res});
});

app.post("/rooms/:room/signalling", function(req, res) {
  var room  = req.param('room');
  var users = rooms[room];
  var type  = req.body.type;
  var event = JSON.stringify(req.body);
  console.log(req.body);

  users.forEach(function(user) {
    if (user.uid === req.body.from)
      return;

    user.stream.write("event: " + type + "\n");
    user.stream.write("data: " + event + "\n\n");
  });

  res.send(200);
});

app.listen(6424);
console.log('Listening on port 6424');

