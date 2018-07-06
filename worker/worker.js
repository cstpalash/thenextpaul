var AWS = require("aws-sdk");
var DOC = require("dynamodb-doc");
AWS.config.update({region: "ap-south-1"});
var docClient = new DOC.DynamoDB();
var moment = require("moment");
var _ = require("lodash");

exports.handler = function (event, context, callback) {

	getPredictions(event.gameId, (error, predictions) => {

		if(error) callback(error);
		else{

			var results = [];
			_.map(predictions, (p) => results.push(handlePrediction(p)));

			Promise.all(results).then(function() {
			    callback(null, { message : "Processed gameId : " + event.gameId })
			}, function(err) {
			    callback(err);
			});
		}

	});
};

function handlePrediction(predictionData){
	return new Promise((resolve, reject) => {

		getActualScore(predictionData.gameId, (error, score) => {
			if(error) reject(error);
			else{
				if(score != null){
					var team1Prediction = predictionData.Team1;
					var team2Prediction = predictionData.Team2;

					var team1Score = score.Team1;
					var team2Score = score.Team2;

					var totalScore = 0;
					if(team1Prediction == team1Score && team2Prediction == team2Score) totalScore = 10;
					else{
						if(findWinner(team1Prediction, team2Prediction) == findWinner(team1Score, team2Score)) totalScore = 5;
					}

					getUser(predictionData.email, (e1, d1) => {
						if(e1) reject(e1);
						else{
							if(d1 != null){
								d1.GameScores[predictionData.gameId] = totalScore;
								d1.time = predictionData.time;
							}
							else{
								d1 = {
									email : predictionData.email,
									time : predictionData.time,
									name : predictionData.name,
									picture : predictionData.picture,
									GameScores : {},
									dummy : 1
								}
								d1.GameScores[predictionData.gameId] = totalScore;
							}

							var total = 0;
							_.map(Object.keys(d1.GameScores), (key) => {
								total += d1.GameScores[key];
							});

							d1.TotalScore = total;

							updateUser(d1, (e2, d2) => {
								if(e2) reject(e2);
								else{
									resolve({ message : predictionData.gameId })
								}
							})
						}
					})
				}
				else{
					console.log("Score not updated for gameId : " + predictionData.gameId);
					resolve({ gameId : predictionData.gameId });
				}
			}
		})

	});
}

function findWinner(t1, t2){
	if(t1 > t2) return 1;
	if(t1 < t2) return -1;
	return 0;
}

function getActualScore(gameId, callback){
	var params = {};
	params.TableName = process.env.tableScore;
	params.Key = { id : gameId };

	docClient.getItem(params, (error, data) => {
    	if(error) {
			console.log(error, error.stack);
			callback(error, null);
		}
		else
    		callback(null, data.Item);
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

function getPredictions(gameId, callback){

	var params = {};
	params.TableName = process.env.tablePrediction;
	params.IndexName = process.env.tablePredictionGameIdIndex;
	params.KeyConditions = [docClient.Condition("gameId", "EQ", gameId)];
	params.Limit = 50;

	var result = [];

	var query = (p, cb) => {
		docClient.query(p, (error, data) => {
	    	if(error) {
				console.log(error, error.stack);
				cb(error);
			}
			else{
				_.map(data.Items, (d) => result.push(d));
				if(data.LastEvaluatedKey){
					p.ExclusiveStartKey = data.LastEvaluatedKey;
					query(p, cb);
				}
				else cb(null, result);
			}
	    });
	}

	query(params, callback);
}