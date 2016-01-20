// Using MongoDB 1.4.4 due to dependency errors with Mongoskin through Monk when using Heroku
var http = require('http');
var URL = require('url');
var monk = require('monk');
var db = monk('localhost:27017/shortlinks');
var collection = db.get("shorts");
var fs = require("fs");

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
      else res.end(json);
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
  collection.find({ "original_url": path }, function(err, documents) {
    if(err) throw err;
    
    var inDB = false;
    
    if(documents.length > 0) inDB = true;
    else inDB = false;
    
    callback(inDB);
  });
}

function getShorts(searchObj, callback) {
  collection.find(searchObj, { _id: false, "original_url": true, "short_url": true }, function(err, documents) {
    if(err) throw err;
    
    if(documents.length > 0) delete documents[0]["_id"]; // Since I, for some inexplicable reason, cannot remove the _id by using projection
    var json = JSON.stringify(documents[0]);
      
    callback(json);
  });
}

function insertIntoDB(path, callback) {
  collection.count({}, function(err, docs) {
    if(err) throw err;
    
    var num = docs+1;
  
    var json = { "original_url": path,
                 "short_url": "https://evening-everglades-43718.herokuapp.com/"+num };
    
    collection.insert(json, function(err, data) {
      if(err) throw err;
      
      delete json["_id"];
      callback(JSON.stringify(json));
    });
  });
}
  
server.listen(process.env.PORT || 8080);