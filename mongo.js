
var db = require("mongojs")("mongodb://localhost:27017/chatlog", ["chatlog","users"]);
var userQueryRes = "Not Set"

function userQuery(name){
  db.users.findOne({username:name}, (err,result)=>{
    output(result)
  });
}

userQuery("Molly");
function output(result){
    console.log(result)
}
