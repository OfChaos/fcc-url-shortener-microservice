// Due to Heroku only allowing MongoDB aaS - which requires CC information, to charge in case you go over the bandwidth, I have opted to not use MongoDB.
// The same file but with MongoDB integration is now in "mongodb_legacy_server.js".
//
// So why not simply fill in CC information? aaS has burned me before when a spambot got at my program, I owed 1500 dollar at the end of the month.
// So no thank you, to that.

var http = require('http');
var URL = require('url');
var fs = require("fs");
var db = JSON.parse(fs.readFileSync("db.json", "utf-8"));

var server = http.createServer(function(req, res) {
  var path = URL.parse(req.url).pathname.toLowerCase();
  
  if(path.substr(0, 5) === "/new/") {
    var newPath = path.substr(5);
    if(newPath === "" ||  !isValidUrl(newPath)) return res.end("Please Enter a valid url.");
      
    isInDB(newPath, function(inDB) {
      if(inDB) { // If it already exists, spew out the existing one, don't waste resources creating a new entry
          
        getShorts({ "original_url": newPath }, function(json) {
          res.end(json);
        });
          
      }
      else insertIntoDB(newPath, function(json) {
        res.end(json);
      });
    });
  }
  else if(/^\/[0-9]+$/.test(path)) {
    getShorts({ "short_url": "https://evening-everglades-43718.herokuapp.com/"+path.substr(1) }, function(json) {
      if(json === undefined) {
        res.end("The requested shortlink does not exist");
      } 
      else {
        //res.end(json);
        res.writeHead(301, {Location: json});
        res.end();
        
      }
    });
  } else {
    var r = fs.readFileSync("./public/index.html");
		res.writeHead(200, "Content-Type", "text/html");
		res.end(r);
  }
});

function isValidUrl(path) {
  return /^https?:\/\/(www.)?[A-Z0-9]+\..+/i.test(path);
}

function isInDB(path, callback) {
  var inDB = false;
  var original = db["original_url"];
  
  for(var i = 0, len = original.length; i < len; i++) {
    if(original[i][path] !== undefined) {
      inDB = true;
      break;
    }
  }
  
  callback(inDB);
}

function getShorts(searchObj, callback) {
  var json;
  var searchArr;
  var toSearch;
  
  if(searchObj["original_url"] !== undefined) {
    
    searchArr = db["original_url"];
    toSearch = searchObj["original_url"];
    
  } else if(searchObj["short_url"] !== undefined) {
    
    searchArr = db["short_url"];
    toSearch = searchObj["short_url"];
    
  }
  
  for(var i = 0, len = searchArr.length; i < len; i++) {
    if(searchArr[i][toSearch] !== undefined) {
      json = searchArr[i][toSearch];
      break;
    }
  }
  
  callback(json);
}

function insertIntoDB(path, callback) {
  var num = db["original_url"].length + 1;
  var short = "https://evening-everglades-43718.herokuapp.com/"+num;
  
  var original_json = {};
  original_json[path] = short;
  
  var short_json = {};
  short_json[short] = path;
  
  db["original_url"].push(original_json);
  db["short_url"].push(short_json);
  
  try {
    fs.writeFileSync("db.json", JSON.stringify(db), "utf-8");
  } catch(err) {
    throw err;
  }
  
  callback(JSON.stringify(original_json));
}
  
server.listen(process.env.PORT || 8080);