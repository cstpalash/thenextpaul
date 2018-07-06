import React, { Component } from 'react';
import moment from 'moment';
import { Panel, Row, Col, Button } from 'react-bootstrap';
import Flag from 'react-world-flags';
import countries from './country.json';
import AppConfig from './AppConfig.json';
import { PulseLoader } from 'react-spinners';
import YouTube from 'react-youtube';
//import _ from 'lodash';

class GameCard extends Component {
  constructor(props, context) {
    super(props, context);

    this.dateFormatDisplay = "hh:mm a";

    this.plusTeam1 = this.plusTeam1.bind(this);
    this.minusTeam1 = this.minusTeam1.bind(this);
    this.plusTeam2 = this.plusTeam2.bind(this);
    this.minusTeam2 = this.minusTeam2.bind(this);
    this.removePrediction = this.removePrediction.bind(this);

    this.save = this.save.bind(this);

    this.displayMyScore = this.displayMyScore.bind(this);

    this.scrollTop = this.scrollTop.bind(this);
    
  }

  scrollTop(){
  	window.scrollTo(0, 0);
  }

  displayMyScore(){
    var { game } = this.state;

    if(game.Team1.Score != null && game.Team1.Prediction != null && 
      game.Team2.Score != null && game.Team2.Prediction != null)
    {

      if(game.Team1.Score === game.Team1.Prediction && game.Team2.Score === game.Team2.Prediction) 
        return game.Team1.Prediction + "-" + game.Team2.Prediction + " : 10 pts";

      var actualResult = "Draw";
      if(game.Team1.Score > game.Team2.Score) actualResult = "Team1";
      else if(game.Team1.Score < game.Team2.Score) actualResult = "Team2";

      var predictedResult = "Draw";
      if(game.Team1.Prediction > game.Team2.Prediction) predictedResult = "Team1";
      else if(game.Team1.Prediction < game.Team2.Prediction) predictedResult = "Team2";

      if(actualResult === predictedResult)
        return game.Team1.Prediction + "-" + game.Team2.Prediction + " : 5 pts";

      return game.Team1.Prediction + "-" + game.Team2.Prediction + " : 0 pts";

    }

    return null;
  }

  save(){

    this.setState({ busy : true });

    var that = this;

    var { game, user } = this.state;

    var payload = {
        token: user.auth.id_token,
        GameId: game.id,
        Team1: game.Team1.Prediction,
        Team2: game.Team2.Prediction
    };

    fetch(AppConfig.api + "/prediction",
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(function(res){ return res.json(); })
    .then(function(data){ 
        game.Team1.Prediction = data.data.Team1;
        game.Team2.Prediction = data.data.Team2;

        that.setState({ game : game, busy : false });
    })
    .catch(function(error) {
        console.log(error);
        that.setState({ busy : false });
    }); 

  }

  removePrediction(){
  	var { game } = this.state;

  	delete game.Team1["Prediction"];
  	delete game.Team2["Prediction"];

    this.save();
  }

  plusTeam1(){


  	var { game } = this.state;

  	var current = game.Team1.Prediction;
  	if(current == null){
  		current = 0;
  		game.Team2.Prediction = 0;
  	}
  	else current++;

  	if(current >=0 && current <= 20){

  		game.Team1.Prediction = current;

  		this.save();
  	}

  }

  minusTeam1(){
  	var { game } = this.state;

  	var current = game.Team1.Prediction;
  	if(current == null){
  		return;
  	}
  	else current--;

  	if(current >=0 && current <= 20){

  		game.Team1.Prediction = current;

  		this.save();
  	}
  }

  plusTeam2(){
  	var { game } = this.state;

  	var current = game.Team2.Prediction;
  	if(current == null){
  		current = 0;
  		game.Team1.Prediction = 0;
  	}
  	else current++;

  	if(current >=0 && current <= 20){

  		game.Team2.Prediction = current;

  		this.save();
  	}
  }

  minusTeam2(){
  	var { game } = this.state;

  	var current = game.Team2.Prediction;
  	if(current == null){
  		return;
  	}
  	else current--;

  	if(current >=0 && current <= 20){

  		game.Team2.Prediction = current;

  		this.save();
  	}
  }

  componentDidMount(){

  	this.setState({ game : this.props.game, user : this.props.user, busy : false });
    
  }

  componentWillReceiveProps(nextProps){
  	this.setState({ game : nextProps.game, user : nextProps.user, busy : false });
  }

  render() {

  	if(!this.state || !this.state.game) return null;

  	var { game, user } = this.state;

  	var startTime = moment.utc(game.time).local();
  	var now = moment();


  	var displayScore = () => {
  		if(game.Team1.Score != null && game.Team2.Score != null){
  			var winner = "";
	  		if(game.Team1.Score > game.Team2.Score) winner = "Team1";
	  		else if (game.Team2.Score > game.Team1.Score) winner = "Team2";

	  		var team1ClassName = "label label-warning";
	  		var team2ClassName = "label label-warning";

	  		if(winner === "Team1"){
	  			team1ClassName = "label label-success";
	  			team2ClassName = "label label-danger";
	  		}
	  		else if(winner === "Team2"){
	  			team1ClassName = "label label-danger";
	  			team2ClassName = "label label-success";
	  		}

	  		return 	<Row>
		      			<Col xs={4}></Col>
		      			<Col xs={2}><span className={team1ClassName}>{game.Team1.Score}</span></Col>
		      			<Col xs={2}><span className={team2ClassName}>{game.Team2.Score}</span></Col>
		      			<Col xs={4}></Col>
		      		</Row>
  		}
  		else return <Row><Col xs={12}>Full time score : TBD</Col></Row>;
  		
  	}

  	var displayPrediction = () => {

  		
  		if(game.Team1.Name === "TBD" && game.Team2.Name === "TBD") return <Row><Col xs={12}><div>Predict later</div></Col></Row>;

  		var halfTime = moment(startTime).add(45, 'm');
  		if(now.isBefore(halfTime)){

  			if(user == null || user.isSignedIn === false) return <Row><Col xs={12}><div>Please <a href="#self" onClick={this.scrollTop}>login</a> to predict</div></Col></Row>;

        if(this.state.busy === true) return <PulseLoader
                                              color={'red'} 
                                              loading={this.state.busy} 
                                            />

  			return 	<Row>
  		      			<Col xs={5}>
  		      				<div style={{ marginTop : 10 }}>
  			      				<Button bsStyle="default" bsSize="xsmall" onClick={this.plusTeam1}>
      								  <span className="glyphicon glyphicon-plus"></span>
      								</Button>
      								<span className="badge" style={{ marginLeft : 5 }}>{game.Team1.Prediction != null ? game.Team1.Prediction : '-' }</span>
      			      				<Button bsStyle="default" bsSize="xsmall" style={{ marginLeft : 5 }} onClick={this.minusTeam1}>
          								  <span className="glyphicon glyphicon-minus"></span>
          								</Button>
      							</div>
      		      	</Col>
  		      			<Col xs={2}>
  		      				<div style={{ marginTop : 10 }}>
  		      					{
  		      						game.Team1.Prediction != null && game.Team2.Prediction != null ?
  		      						<span style={{ cursor : "pointer" }} onClick={this.removePrediction} className="glyphicon glyphicon-trash"></span> : null
  		      					}
  		      				</div>
  		      			</Col>
  		      			<Col xs={5}>
  		      				<div style={{ marginTop : 10 }}>
  			      				<Button bsStyle="default" bsSize="xsmall" onClick={this.plusTeam2}>
      								  <span className="glyphicon glyphicon-plus"></span>
      								</Button>
  								    <span className="badge" style={{ marginLeft : 5 }}>{game.Team2.Prediction != null ? game.Team2.Prediction : '-' }</span>
    			      				<Button bsStyle="default" bsSize="xsmall" style={{ marginLeft : 5 }} onClick={this.minusTeam2}>
    								  <span className="glyphicon glyphicon-minus"></span>
  								</Button>
  							</div>
  		      			</Col>
      		      		</Row>
  		}
  		else return <Row><Col xs={12}><div>Too late to predict!</div></Col></Row>;
  	}

  	var panelStyle = "default";
  	if(startTime.isBefore(moment(now).startOf("day"))) panelStyle = "danger";
  	else if(startTime.isAfter(moment(now).endOf("day"))) panelStyle = "warning";
  	else panelStyle = "success";

  	if(game.Team1.Name === "TBD" && game.Team2.Name === "TBD") panelStyle = "default";

    var myScore = this.displayMyScore();

    return (
        <Panel bsStyle={panelStyle}>
          <Panel.Heading>
            <Panel.Title componentClass="h3">{startTime.format(this.dateFormatDisplay)} - {game.round} ({game.id}/64) <span className="label label-danger pull-right">{myScore}</span></Panel.Title>
          </Panel.Heading>
          <Panel.Body style={{ textAlign : "center" }}>
      		<Row>
      			<Col xs={5}>{game.Team1.Name} <Flag code={countries[game.Team1.Name]} height="16" /></Col>
      			<Col xs={2}><span className="badge">VS</span></Col>
      			<Col xs={5}><Flag code={countries[game.Team2.Name]} height="16" /> {game.Team2.Name}</Col>
      		</Row>
      		{displayScore()}
      		{displayPrediction()}
          </Panel.Body>
          {
            game.video != null ? 
              <Panel.Footer>
                  <div className="yt-container">
                    <YouTube
                      videoId={game.video}
                    />
                  </div>
              </Panel.Footer> : null
          }
          
        </Panel>
    );
  }
}

export default GameCard;