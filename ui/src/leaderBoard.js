import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';
import AppConfig from './AppConfig.json';
import { PulseLoader } from 'react-spinners';
import _ from 'lodash';
//import _ from 'lodash';

class LeaderBoard extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      leaders : [],
      busy : false
    };
  }


  componentDidMount(){
    var that = this;

    this.setState({busy:true});

    fetch(AppConfig.api + "/points",
    {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
    })
    .then(function(res){ return res.json(); })
    .then(function(data){ 
        that.setState({busy:false, leaders:data.data});
    })
    .catch(function(error) {
        console.log(error);
        that.setState({busy:false});
    });
  }

  render() {

    if(this.state.busy === true) return <PulseLoader
                                              color={'red'} 
                                              loading={this.state.busy} 
                                            />

  	var displayLeaders = _.map(_.orderBy(this.state.leaders, ['TotalScore', 'time'], ['desc', 'asc']), (lead, i) => {
        return  <Col xs={6} md={4} lg={4} key={i}>
                  <div className="thumbnail App">
                    <span className="badge badge-notify">{i+1}</span>
                    <p>Total points : <span className="label label-success">{lead.TotalScore}</span></p>
                    <img src={lead.picture} alt={lead.name} />
                    <div className="caption">
                      {lead.name}
                      
                    </div>
                  </div>
                </Col>
    })
    return (
          <Row>
            {this.state.leaders.length === 0 ? "Nothing to be displayed" : displayLeaders}
          </Row>
    );
  }
}

export default LeaderBoard;