import React, { Component } from 'react';
import { Carousel, Navbar, Nav, NavItem, NavDropdown, MenuItem, Modal, Button, Image, Grid, Row, Col, Panel, Label, Glyphicon  } from 'react-bootstrap';
import './App.css';
import fixture from './games.json';
import _ from 'lodash';
import moment from 'moment';
import GameCard from './gameCard';
import { GoogleLogin, GoogleLogout } from 'react-google-login';
import AppConfig from './AppConfig.json';
import LeaderBoard from './leaderBoard';

class App extends Component {
  constructor(props, context) {
    super(props, context);

    this.refNodes = {};

    this.dateFormatGroupBy = "ddd DD-MMM-YYYY";

    this.handleCloseWhoIsPaul = this.handleCloseWhoIsPaul.bind(this);
    this.handleShowWhoIsPaul = this.handleShowWhoIsPaul.bind(this);

    this.handleCloseLeaderboard = this.handleCloseLeaderboard.bind(this);
    this.handleShowLeaderboard = this.handleShowLeaderboard.bind(this);

    this.onLoginSuccess = this.onLoginSuccess.bind(this);
    this.onLoginFailure = this.onLoginFailure.bind(this);
    this.logout = this.logout.bind(this);

    this.handleScrollToCurrent = this.handleScrollToCurrent.bind(this);
    this.setUserData = this.setUserData.bind(this);


    this.state = {
      modalWhoIsPaul: false,
      modalLeaderboard : false,
      games: []
    };
  }

  setUserData(user){

    var { games } = this.state;

    var that = this;

    var payload = {
        token: user.auth.id_token
    };

    fetch(AppConfig.api + "/predictions",
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

        _.map(games, (g) => { 
          delete g.Team1["Prediction"];
          delete g.Team2["Prediction"]; 
        });

        _.map(data.data.predictions.Items, pred => {

          var selectedGame = _.find(games, (g) => { return g.id === pred.gameId; });
          if(selectedGame != null){
            selectedGame.Team1.Prediction = pred.Team1;
            selectedGame.Team2.Prediction = pred.Team2;
          }
        });

        that.setState({ games:games, user : user, points : data.data.me });
        that.handleScrollToCurrent();
        localStorage.setItem("user", JSON.stringify(user));
    })
    .catch(function(error) {
        console.log(error);
        that.setState({ user : null });
        localStorage.removeItem("user");
    }); 

  }

  logout(){
    this.setState({user:null});
    localStorage.removeItem("user");
  }

  onLoginSuccess(response){
    var profile = response.getBasicProfile();
    var user = {
      isSignedIn : response.isSignedIn(),
      id : profile.getId(),
      name : profile.getName(),
      givenName : profile.getGivenName(),
      familyName : profile.getFamilyName(),
      image : profile.getImageUrl(),
      email : profile.getEmail(),
      auth : response.getAuthResponse(true)
    }

    this.setUserData(user);
  }

  onLoginFailure(error, details){

    this.setState({user:null});
  }

  componentDidMount(){

    var games = fixture.games;

    var that = this;

    fetch(AppConfig.api + "/scores",
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
    })
    .then(function(res){ return res.json(); })
    .then(function(data){ 

        _.map(data.data, sc => {

          var selectedGame = _.find(games, (g) => { return g.id === sc.id; });
          if(selectedGame != null){
            selectedGame.Team1.Score = sc.Team1;
            selectedGame.Team2.Score = sc.Team2;
            selectedGame.video = sc.video;
          }
        });

        that.setState({ games:games });

        var userData = localStorage.getItem("user");
        var user = null;
        if(userData != null){
          user = JSON.parse(userData);
          var expiry = moment.utc(user.auth.expires_at).local();

          if(moment().isAfter(expiry.add(-60, 's'))){ //60 seconds buffer
            user = null;
            localStorage.removeItem("user");
          }
        }

        if(user != null) that.setUserData(user);
        
    })
    .catch(function(error) {
        //that.setState({ busy : false });
    }); 
    
  }

  handleCloseWhoIsPaul(){
    this.setState({ modalWhoIsPaul : false });
  }

  handleShowWhoIsPaul(){
    this.setState({ modalWhoIsPaul : true });
  }

  handleCloseLeaderboard(){
    this.setState({ modalLeaderboard : false });
  }

  handleShowLeaderboard(){
    this.setState({ modalLeaderboard : true });
  }

  handleScrollToCurrent(){
    var divId = moment().local().format(this.dateFormatGroupBy);
    if(this.refNodes[divId] != null)
      this.refNodes[divId].scrollIntoView();
  }

  render() {

    var { user, points } = this.state;

    var sortedGames = _.sortBy(this.state.games, function(o) { return new moment(o.time); });

    var matchesByDay = _.groupBy(sortedGames, item => {
      return moment.utc(item.time).local().format(this.dateFormatGroupBy);
    });

    var displayMatchesByDay = _.map(Object.keys(matchesByDay), key => {
      var matches = matchesByDay[key];

      var displayGames = _.map(matches, (game) => {

        return  <Col xs={12} sm={6} md={4} lg={4} key={game.id}>
                  <GameCard game={game} user={this.state.user} />
                </Col>
      })

      return  <Row key={key}>
                <Col xs={12}>
                  <div>
                    <h4 className="page-header" id={key} ref={node => this.refNodes[key] = node}><strong>{key}</strong></h4>
                    <Grid>
                      <Row>
                        {displayGames}
                      </Row>
                    </Grid>
                  </div>
                </Col>
              </Row>
    });

    var displayMyPoints = () => {

      if(user == null) return   <Row style={{ marginTop : 10 }}>
                                  <Col xs={12}>
                                    <h4><span className="label label-warning"><a href="#self" onClick={this.handleShowLeaderboard}>View leaderboard</a></span></h4>
                                  </Col>
                                </Row>

      var totalPoints = 0;
      if(points != null) {
        totalPoints = points.TotalScore;
      }

      return  <Row style={{ marginTop : 10 }}>
                <Col xs={12}>
                  <b>My total points : </b>
                  <span className="label label-success">{totalPoints}</span><br/>
                  <h4><span className="label label-warning"><a href="#self" onClick={this.handleShowLeaderboard}>View leaderboard</a></span></h4>
                  
                </Col>
              </Row>
    }

    return (
      <div>
        <Navbar inverse collapseOnSelect>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#self">Become the next Paul</a>
            </Navbar.Brand>
            <Navbar.Toggle />
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <NavItem eventKey={1} href="#self" onClick={this.handleShowWhoIsPaul}>
                Who was Paul?
              </NavItem>
            </Nav>
            <Nav pullRight>
              {this.state.user != null && this.state.user.isSignedIn === true ?
                <NavDropdown eventKey={2} title={this.state.user.name} id="basic-nav-dropdown">
                  <MenuItem eventKey={2.1}>
                    <GoogleLogout buttonText="Logout" onLogoutSuccess={this.logout}></GoogleLogout>
                  </MenuItem>
                </NavDropdown> : null
              }
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Grid>
          <Row>
            <Col xs={12}>
              <div className="fb-like" data-href="https://www.facebook.com/fwcadbwj/" data-layout="standard" data-action="like" data-size="small" data-show-faces="true" data-share="true"></div>
            </Col>
          </Row>
          <Row style={{ marginTop : 10 }}>
            <Col xs={12} md={6}>
              <Carousel>
                <Carousel.Item>
                  <img alt="banner" src="/banner.png" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="banner" src="/banner1.png" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="banner" src="/banner2.png" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="banner" src="/banner3.png" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="banner" src="/banner4.png" />
                </Carousel.Item>
                <Carousel.Item>
                  <img alt="banner" src="/banner5.png" />
                </Carousel.Item>
              </Carousel>
              
            </Col>
            {
              (this.state.user == null || this.state.user.isSignedIn === false) ?
                <Col xs={12} md={6}>
                  <div>
                    <Panel bsStyle="primary">
                      <Panel.Heading>
                        <Panel.Title componentClass="h3">Become the next Paul <Glyphicon glyph="question-sign" onClick={this.handleShowWhoIsPaul} style={{ cursor: "pointer" }} /></Panel.Title>
                      </Panel.Heading>
                      <Panel.Body>
                        <p>
                          <GoogleLogin
                            clientId="345868119626-q02c1n51m9ls3bsbnbreomcntvrtfk6n.apps.googleusercontent.com"
                            buttonText="Login with Google"
                            onSuccess={this.onLoginSuccess}
                            onFailure={this.onLoginFailure}/>
                        </p>
                        <Label>Points</Label>
                        <ul>
                          <li>Correct guess of the winner of a game : 5 points</li>
                          <li>Correct guess of exact score (and winner) of a game : 10 points</li>
                        </ul>
                        <Label>General rules</Label>
                        <ul>
                          <li>Prediction is allowed till half-time of any game</li>
                          <li>In case of equal points, who guessed first will be the winner</li>
                        </ul>
                      </Panel.Body>
                    </Panel>
                  </div>
                </Col> : null
            }
            
          </Row>
          {displayMyPoints()}
          {this.state.games.length > 0 ? displayMatchesByDay : null}
          <Modal show={this.state.modalLeaderboard} onHide={this.handleCloseLeaderboard}>
            <Modal.Header closeButton>
              <Modal.Title>Leaderboard</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <LeaderBoard/>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.handleCloseLeaderboard}>Close</Button>
            </Modal.Footer>
          </Modal>
        </Grid>

        <Modal show={this.state.modalWhoIsPaul} onHide={this.handleCloseWhoIsPaul}>
          <Modal.Header closeButton>
            <Modal.Title>Who was Paul?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="App">
              <Image src="/paul.png" rounded />
            </div>
            <div style={{ paddingTop : 10 }}>
              <p>
                <b><a href="https://en.wikipedia.org/wiki/Paul_the_Octopus" target="_blank" rel="noopener noreferrer">Paul the Octopus</a></b> (26 January 2008 – 26 October 2010) was a common octopus which was purportedly used to predict the results of association football matches. Accurate predictions in the 2010 World Cup brought him worldwide attention as an animal oracle.
              </p>
              <p>
                During divinations, Paul's keepers would present him with two boxes containing food. The boxes were identical except that they were decorated with the different team flags of the competitors in an upcoming football match. Whichever box Paul ate from first was considered his prediction for which team would win the match.
              </p>
              <p>
                His keepers at the Sea Life Centre in Oberhausen, Germany, mainly tasked him with predicting the outcomes of international matches in which the German national football team was playing. Paul correctly chose the winning team in four of Germany's six Euro 2008 matches, and all seven of their matches in the 2010 World Cup—including Germany's third place play-off win over Uruguay on 10 July. He also correctly chose Spain as the winner of the 2010 FIFA World Cup final. [2] In all, Paul amassed an overall record of 12 correct predictions out of 14: a success rate of approximately 85.7%.
              </p>
              <p>
                Experts have proposed several scientific theories to explain Paul's seemingly prescient behaviour, which range from pure luck to the possibility that he was attracted to the appearance or the smell of one box over another.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.handleCloseWhoIsPaul}>Close</Button>
          </Modal.Footer>
        </Modal>

        

      </div>
    );
  }
}

export default App;
