import React, { Component } from "react";
import Header from "./components/Header";
import Body from "./components/Body";
import { Route } from "react-router-dom"
import LandingPage from "./components/LandingPage"
import "./App.css";

class App extends Component {
  render() {
    return (
      <div>
        <Route exact path='/' component={Default}/>
        <Route path='/landing' component={LandingPage} />
      </div>
    );
  }
}

class Default extends Component {
  render() {
    return (
      <div>
        <Header />
        <Body />
      </div>
    )
  }

}

export default App;
