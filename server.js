const express = require('express');
const path = require('path');

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var CryptoJS = require("crypto-js");
users = [];
rooms = [{room:0, slot0:"Join", slot1:"Join"}];
var userIDs = null
var userQuery = null
connections = [];
var clearUsers = 0;



var db = require("mongojs")("mongodb://localhost:27017/chatlog", ["chatlog","users"]);

function getLastMessages(){
  db.chatlog.find({}).sort({_id:-1}).limit(10, (err,logs)=>{
    io.sockets.emit('get chats', logs);
  });
}






//starts the Node Server
server.listen(3305);
console.log("server running on port 3305");

//serves the index.html file
app.get('/', function(req, res){
  res.sendFile(__dirname +'/index.html');
});
//serves the Disconnected page
app.get('/DC', function(req, res){
  res.send("You have been Disconnected. This is likely due to the server restarting.<br /><button onclick='goBack()'>Go Back</button><script>function goBack() {location.href='../';}</script>");
});


//sets up the static dependancy folders to be served
app.use(express.static(__dirname + '/public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));





//starts the Socket.io connection
io.sockets.on('connection', function(socket){
  connections.push(socket);
  socket.username = "Unidentified_" + socket.id.substr(0,3);
  users.push(socket.username);
  console.log("Connected: %s sockets connected", connections.length);
  getLastMessages();
  updateUsernames();


  //disconnect
  socket.on('disconnect', function(data){
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
    leaveRooms()
    io.sockets.emit('update rooms', rooms)
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  //send
  socket.on('send message', function(data){
  if (users.includes(socket.username)){
    if (data === "/addroom"){
      rooms.push({room:rooms[rooms.length-1].room+1, slot0:"Join", slot1:"Join"})
      io.sockets.emit('update rooms', rooms)
    }else if (data === "/resetrooms"){
      resetRooms()
    }
    else{
    io.sockets.emit('new message', {msg:data, user:socket.username});
    db.chatlog.insert({msg:data, user:socket.username, time: Date.now() / 1000 | 0});
    }
  }
  });


   //Room selector
   socket.on('choose room', function(data){
     leaveRooms()
     
     if (typeof rooms[data.room] === 'undefined'){
       rooms.push({room:data.room, slot0:"Join", slot1:"Join"})
     }
     
     if (data.slot === 1 && rooms[data.room].slot1 === "Join"){
       rooms[data.room].slot1 = socket.username;
       console.log("Room "+data.room+ " Slot "+ data.slot+ " taken by "+ rooms[data.room].slot1)
     }
     if (data.slot === 0 && rooms[data.room].slot0 === "Join"){
       rooms[data.room].slot0 = socket.username;
       console.log("Room "+data.room+ " Slot "+ data.slot+ " taken by "+ rooms[data.room].slot0)
     }

     
      //sends list of rooms as objects formatted like {room:data.room, slot0:"Join", slot1:"Join"}
     io.sockets.emit('update rooms', rooms);
  });
  
  //adds new room
  socket.on('new room', function(data){
    rooms.push({room:rooms[rooms.length-1].room+1, slot0:"Join", slot1:"Join"})
  });
  
  
  

  //login
  socket.on('login', function(data, callback){
    // if loginDB passes, this function is called to send a successful login to client
    function logon(){
      callback(true);
      //removes temp username from list of users
      users.splice(users.indexOf(socket.username), 1);
      //adds authenticated username to list of users
      socket.username = data.username;
      users.push(socket.username);
      //sends current list of users to clients
      updateUsernames();
      io.sockets.emit('update rooms', rooms)
    }



      // queries the DB for username
    function loginDB(){
      db.users.findOne({username:data.username}, (err,result)=>{
        checklogin(result)
      });
        // if the username was in the DB then check to make sure the pass is correct:
      function checklogin(login){
        if(login != null){
          if (login.password === data.password){
            console.log(login.username+" Authenticated")
            logon()
          }else{
            console.log("User In DB. Wrong Pass")
            callback(false)
          }
          // if the username was not in the DB then add it to the DB w/password and login
        }else{
          console.log("user not in DB Logging in no auth")
          db.users.insert({username:data.username, password:data.password},(err,results)=>{
            if (results){console.log(data.username+" Added to DB")}
          })
          logon()
        }
      }
    }

     // if user is not already in the signed in list, and not named Test then check the DB
    if(data.username === "Test" || users.includes(data.username) ){
      console.log("user is either 'Test' or already signed in");
      callback(false)
    }else{
      loginDB()
    }
  });


      //sends current list of usernames to the client
    function updateUsernames(){
      console.log(users)
      io.sockets.emit('get users', users);
    }

      // might rename, sends all users to the DC page, usually due to server restart
    function dcNoName(){
      io.sockets.emit('no name disconnect', "DC");
      updateUsernames();
    }

    if (clearUsers === 0){
       setTimeout(dcNoName, 1500);
       clearUsers =1;
    }
    function leaveRooms(){
      for (var i = 0, len = rooms.length; i < len; i++) {
        console.log("Removed "+ socket.username+" from all rooms")
        if (rooms[i].slot1 === socket.username){rooms[i].slot1 = "Join"}
        if (rooms[i].slot0 === socket.username){rooms[i].slot0 = "Join"}
      }
    }
    function resetRooms(){
      rooms = [{room:0, slot0:"Join", slot1:"Join"}];
      io.sockets.emit('update rooms', rooms)
    }


});
