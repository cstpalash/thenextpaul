var unirest = require("unirest");
var AWS = require("aws-sdk");
var DOC = require("dynamodb-doc");
AWS.config.update({region: "ap-south-1"});
var docClient = new DOC.DynamoDB();
var moment = require("moment");
var fixture = require("./games.json");
var _ = require("lodash");


var ApiBuilder = require('claudia-api-builder'),
  api = new ApiBuilder();

const CLIENT_ID = process.env.clientId;
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

module.exports = api;

//api.corsOrigin(process.env.corsUrl);

api.get('/scores', function (requestData) {

  	return new Promise((resolve, reject) => {

	  	getScores((error, data) => {
			if(error){
				resolve({
					error : "Something went wrong, please try again later."
				});
			}
			else{
				resolve({
					data : data
				});
			}
		});
    
  	}).then((response) => response);
});

api.get('/points', function (requestData) {

  	return new Promise((resolve, reject) => {

	  	getPoints((error, data) => {
			if(error){
				resolve({
					error : "Something went wrong, please try again later."
				});
			}
			else{
				resolve({
					data : data.Items
				});
			}
		});
    
  	}).then((response) => response);
});

function getPoints(callback){

	var params = {};
	params.TableName = process.env.tableUser;
	params.IndexName = process.env.tableUserPointIndex;
	params.ScanIndexForward = false;
	params.KeyConditions = [docClient.Condition("dummy", "EQ", 1)];
	//params.Limit = 100;

	docClient.query(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error);
		}
		else{
			callback(null, data);
		}
    });
}

api.post('/predictions', function (requestData) {

  	return new Promise((resolve, reject) => {

	  	var token = requestData.body.token;
  		if(token == null){
  			resolve({
				error : "No token"
			});
		}

		verify(token).then((usr) => {

			getUser(usr.email, (error, data) => {
				if(error){
					resolve({
						error : "Something went wrong, please try again later."
					});
				}
				else{
					var dataToBeReturned = { me : data };
					
					getPredictions(usr.email, (error1, data1) => {
						if(error1){
							resolve({
								error : "Something went wrong, please try again later."
							});
						}
						else{
							dataToBeReturned.predictions = data1;
							resolve({
								data : dataToBeReturned
							});
						}
					});
				}
			});	
			
			

			

		}).catch((e) => {
		  	console.log(e);
		  	resolve({
				error : "Invalid token"
			});
		})
    
  	}).then((response) => response);
});

api.post('/prediction', function (requestData) {

  	return new Promise((resolve, reject) => {

  		var token = requestData.body.token;
  		if(token == null){
  			resolve({
				error : "No token"
			});
		}

  		verify(token).then((usr) => {
			var predictionData = {
				email : usr.email,
				name: usr.name,
				picture: usr.picture,
				gameId : requestData.body.GameId,
				Team1 : requestData.body.Team1,
				Team2 : requestData.body.Team2,
				time : moment().utc().unix()
			};

			if(predictionData.Team1 == null && predictionData.Team2 == null){
				removeUnusedProperties(predictionData);
				deletePrediction(predictionData, (error, data) => {
					if(error){
						resolve({
							error : "Something went wrong, please try again later."
						});
					}
					else{
						resolve({
							data : data
						});
					}
				});
			}
			else{
				updatePrediction(predictionData, (error, data) => {
					if(error){
						resolve({
							error : "Something went wrong, please try again later."
						});
					}
					else{
						resolve({
							data : data
						});
					}
				});

			}

			

		}).catch((e) => {
		  	console.log(e);
		  	resolve({
				error : "Invalid token"
			});
		})
	  	
    
  	}).then((response) => response);
});

function getScores(callback){
	var params = {};
	params.TableName = process.env.tableScore;

	docClient.scan(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, data.Items);
    });
}

function getUser(email, callback){
	var params = {};
	params.TableName = process.env.tableUser;
	params.Key = { email : email };

	docClient.getItem(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, data.Item);
    });
}

function updateUser(user, callback){
	removeUnusedProperties(user);

	var params = {};
	params.TableName = process.env.tableUser;
	params.Item = user;

	docClient.putItem(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, user);
    });
}

function updatePrediction(pred, callback){

	var gameData = _.find(fixture.games, (g) => { return g.id === pred.gameId });
	if(gameData == null) callback({ message : "gameId not found"}, null);
	var startTime = moment.utc(gameData.time);
  	var now = moment().utc();
  	var halfTime = moment(startTime).add(45, 'm');
  	if(now.isAfter(halfTime)) callback({ message : "too late to predict"}, null);
  	if(gameData.Team1.Name == "TBD" && gameData.Team2.Name == "TBD") 
  		callback({ message : "predict later"}, null);


	var params = {};
	params.TableName = process.env.tablePrediction;
	params.Item = pred;

	docClient.putItem(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, pred);
    });
}

function getPredictions(email, callback){

	var params = {};
	params.TableName = process.env.tablePrediction;
	params.KeyConditions = [docClient.Condition("email", "EQ", email)];

	docClient.query(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, data);
    });
}

function deletePrediction(pred, callback){

	var params = {};
	params.TableName = process.env.tablePrediction;
	params.Key = { email : pred.email, gameId : pred.gameId };

	docClient.deleteItem(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, pred);
    });
}

async function verify(token) {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID 
  });
  const payload = ticket.getPayload();


  if(CLIENT_ID != payload['aud']) throw Exception("client id did not match");

  var user = {
    //userid : payload['sub'],
    email : payload['email'],
    name : payload['name'],
    picture : payload['picture']
  }

  return user;
}

function removeUnusedProperties(obj){
	Object.keys(obj).forEach(key => {
		if (obj[key] == null || obj[key] == undefined || obj[key]== '') delete obj[key];
	});
}