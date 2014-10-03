var _ = require('underscore');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase('http://beermeappinteger.cloudapp.net:7474/');
var http = require('http');
var fs = require('fs');
var utils = require('./utils');
var jwt = require('jwt-simple');
var jwtauth = require('./config/middleware.js');
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');
var bodyParser = require('body-parser');

module.exports = db;
///////////////////////////
//Helper Funcs
//////////////////////////
// db.createIfDoesntExist = function(nodeType,properties,callback){
//   var params = {
//     nodeType: nodeType
//   };
//   for (var i in properties){
//     params[i] = properties[i]
//   }
//   db.query("MERGE (n:({nodeType}) {({}) } )",params,function(err,result){
//     if(err){
//       callback(err)
//     } else {
//       callback();
//     }
//   })
// }

//How to delete everything in the database: db.query("match (n) optional match (n)-[r]-() delete n, r",function(){})

var getAllBeerQuery = "MATCH (n:Beer) RETURN n;";

var createNewBeerQuery = ["CREATE (n:Beer {name: ({name}), ibu: ({ibu}), abv: ({abv}), description: ({description}), imgUrl: ({imgUrl}), iconUrl: ({iconUrl}), medUrl: ({medUrl}), brewery: ({brewery}), website: ({website}) })",
						  "RETURN n;"].join('\n');
var createNewBeerQueryWithBrewery = "CREATE (n:Beer {name: ({name}), ibu: ({ibu}), abv: ({abv}), description: ({description}), imgUrl: ({imgUrl}), iconUrl: ({iconUrl}), medUrl: ({medUrl}), brewery: ({brewery}), website: ({website}) })"
var getOneBeerByNameQuery = "MATCH (n:Beer {name: {name}}) RETURN n;"

var generateSimilarityQuery = ["MATCH (u1:User {username: ({username})})-[x:Likes]->(b:Beer)<-[y:Likes]-(u2:User)",
                               "WITH SUM(x.rating * y.rating) AS xyDotProduct,",
                                    "SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.rating) | xDot + a^2)) AS xLength,", 
                                    "SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.rating) | yDot + b^2)) AS yLength,",
                                    "u1, u2", 
                               "MERGE (u1)-[s:Similarity]->(u2) SET s.similarity = xyDotProduct / (xLength * yLength)"].join('\n');
var generateLikseQuery = 'MATCH (u:User),(b:Beer)\nWHERE u.username=({username}) AND b.name=({beername})\nMERGE (u)-[l:Likes {rating: ({rating})}]->(b)'
var checkLikesQuery = "MATCH (u:User)-[l:Likes]->(b:Beer) WHERE u.username =({username}) AND b.name =({beername}) return l";
var updateLikesQuery = "MATCH (u:User)-[l:Likes]->(b:Beer) WHERE u.username =({username}) AND b.name =({beername}) SET l.rating = ({rating})"
var generateRecommendationQuery = ['MATCH (u1:User)-[r:Likes]->(b:Beer),',
                                  '(u1)-[s:Similarity]-(u2:User {username:({username})})',
                                  'WHERE NOT((u2)-[:Likes]->(b))',
                                  'WITH b, s.similarity AS similarity,',
                                  'r.rating AS rating', 
                                  'ORDER BY b.name, similarity DESC',
                                  'WITH b AS beer, COLLECT(rating)[0..3] AS ratings',
                                  'WITH beer, REDUCE(s = 0, i IN ratings | s + i)*1.0 / LENGTH(ratings) AS reco ORDER BY reco DESC',
                                  'RETURN beer AS Beer, reco AS Recommendation'].join('\n');

db.getAllBeer = function(callback){
	db.query(getAllBeerQuery, {}, function(err, allBeers){
		if(err){
			console.log(err);
		}else{
			console.log("Got all beers");
			callback(allbeers);
		}
	});
};

db.getOneBeer = function(beername, callback){
  var params = {
    name: beername
  };

  db.query(getOneBeerByNameQuery, params, function(err, beer){
    if(err){
      console.log(err);
    }else{
      // console.log(utils.makeData(beer, 'n')[0]);
      var beerArray = utils.makeData(beer, 'n');
      if(beerArray.length === 0){
        callback(undefined);
      }else{
        callback(beerArray[0]);
      }
    }
  });
};

db.generateSimilarity = function(user, callback){
  var params = {
    username: user.username
  };

  db.query(generateSimilarityQuery, params, function(err){
    if(err){
      console.log("Error is here:", err);
      callback(err);
    }else{
      console.log("Successfully created similarity relationships for: ", user.username);
      callback(null);
    }
  });
};

db.generateLikes = function(user, beer, rating, callback){
  var params = {
    username: user.username,
    beername: beer.beername,
    rating: rating
  };

  db.query(checkLikesQuery, params, function(err, likes){
    if(err){
      console.log(err);
      callback(err);
    }else{
      console.log(likes);
      if(likes.length === 0){
          db.query(generateLikseQuery, params, function(err){
            if(err){
              console.log(err);
              callback(err);
            }else{
              console.log("Successfully created likes relationships between user and beer");
              callback(null);
            }
          });
      }else{
        db.query(updateLikesQuery, params, function(err){
          if(err){
            console.log(err);
            callback(err);
          }else{
            console.log("Successfully updated likes relationships between user and beer");
            callback(null);
          }
        });
      }
    }
  });
};

db.generateRecommendation = function(user, callback){
  var params = {
    username: user.username
  };

  db.query(generateRecommendationQuery, params, function(err, result){
    if(err){
      console.log("Error is here: ", err);
      callback(err, null);
    }else{
      var recommendationBeers = utils.makeData(result, 'Beer');

      for(var i = 0; i < result.length; i++){
        result[i].Beer = recommendationBeers[i];
      }

      console.log("Here is the result: ", result);
      callback(null, result);
    }
  });
};

// db.getUserRating = function(username, beers){
//   var params = {username: username, beername: beername};
//   db.query("MATCH (n:User {username: ({username})})-[r:Likes]-(b:Beer {name: ({beername})}) RETURN b,r", params, function(err, data){
//     if (err){
//       console.log('Error:', err);
//     }
//     var beerRatings = {};
//     for 
//     }
//   })
// }


db.showUserLikes = function(username,callback){
  var params = {username: username};
  db.query("MATCH (n:User {username: ({username})})-[r:Likes]-(b) RETURN b,r",params,function(err,data){
    if(err){
      console.log('Error:', err);
    }
    var ratedBeers = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: []
    }
    var ratingReverse = {
      5: 1,
      4: 2,
      3: 3,
      2: 4,
      1: 5
    }
    console.log('rated Beers',ratedBeers)
    for(var i=0; i<data.length; i++) {
      var beerObj = data[i]['b']['data']; // [{abv:,ibu:,name:,etc...},{abv:,ibu:,name:,etc...}]
      console.log('BEEROBJ ', beerObj);
      var ratingObj = data[i]['r']['data']; //{rating: 3}
      var rating = ratingObj.rating;
      console.log('RATING OBJ ', ratingObj)
      var ratingCoded = ratingReverse[rating]
      console.log('rating: ',rating);
      ratedBeers[ratingCoded].push(beerObj);
    }
    console.log('hello?')
    // console.log('beer results :',data[0]['b']['data']);
    // console.log('rating results: ',data[0]['r']['data']);
    // console.log('rated beers collection: ',ratedBeers)
    console.log('about to invoke callback')
    callback(ratedBeers)
  })
}

// This function gets called by routes.js in response to POST requests to '/searchBeer' 
// It takes a string and a callback, it queries the database for all beers that have a name
// that contains the string, and then it invokes the callback on an array containing all of
// the resulting beer nodes. The callback will be a function that invokes res.send(beers)
db.findAllBeersWithNameContaining = function(beerString,callback){
  var params = {regEx: '(?i).*'+beerString+'.*'  };
  //query the server for all beer nodes with a name property that contains the characters in beerString
  db.query("MATCH (n) WHERE n.name =~ ({regEx}) RETURN n", params, function(err,data){
    if(err){
      console.log('error :',err)
    }
    //iterate over the results of the query
    var beers = [];
    for(var i=0;i<data.length;i++){
      var beerNode = data[i].n.data;
      beers.push(beerNode);
    }
    // invoke the callback on the results
    callback(beers);
  })
};

// call callback if user is authorized
db.authenticateUser = function( userInfo, callback){
  console.log('inside authenticateUser')
  var params = {
      username: userInfo.body.username,
      password: userInfo.body.password
    }
  db.query('MATCH (n:User {username: ({username})}) RETURN n',params, function(err,data) {
    if(err) {console.log('OptionalMatch error: ',err)};
    // if the user exists
    if (data.length) {
      var node = data[0].n.data;
      var username = node.username;
      var password = node.password;
      console.log('thepassword: ',password);
      // hash the password and check if it matches
      bcrypt.compare(params.password,password, function(err,match){
        // if the password matches
        if(match){
          console.log('matchh')
          var token = jwt.encode(username, 'secret');
          var expires = moment().add(7, 'days').valueOf();
          console.log('token in routes js = ', token, 'expires', expires)
          var tokenData = {}
          tokenData.token = token;
          tokenData.expires = expires;
          tokenData = JSON.stringify(tokenData)
          console.log('tokenData :',tokenData)
          callback('sendToken',tokenData);
          // res.json({token: token, expires: expires});
        } else {
          // if the password doesn't match
          console.log('Wrong password')
          callback('wrong password')
          // res.send('Wrong password');
        }
      })
    }
  })
}

db.addUserToDatabaseIfUserDoesNotExist = function(userInfo, callback){
  var params = {
      username: userInfo.body.username,
      password: userInfo.body.password
    }
  // check whether the username is already taken
  db.query('OPTIONAL MATCH (n:User {username: ({username})}) RETURN n', params, function(err,data) {
    if(err) console.log('signup error: ',err);
    var dbData = data[0];
    // if the username is already taken, send back message
    if(dbData.n !== null){
      callback('Username already taken')
      // res.send('Username already taken')
    } else { 
      // if the username is available, hash the password
      var salt = bcrypt.genSaltSync(10);
      bcrypt.hash(params.password, salt,null, function(err,hash){
        if (err) console.log('bcrypt error', err)
        params.password = hash;
        // then create a user node in the database with a password equal to the hash
        db.query("CREATE (n:User {username: ({username}), password: ({password})})", params, function(err,data){
          if (err) {
            console.log('error', err)
          }
          var token = jwt.encode(params.username, 'secret');
          var expires = moment().add('days', 7).valueOf();
          console.log('token in routes js = ', token, 'expires', expires)
          var tokenData = {};
          tokenData.token = token;
          tokenData.expires = expires;
          callback('createUser',tokenData)
          // res.json({token: token, expires: expires});
        })
      })
    }
  })
}

