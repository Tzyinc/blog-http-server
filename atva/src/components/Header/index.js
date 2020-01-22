import React, { Component } from "react";

import "./style.css";

class Header extends Component {
  render() {
    return (
      <div className="header">
        <div className="header-text">
          <img src="./Logo.png" alt="" className="header-logo" />
          <span style={{ verticalAlign: "middle" }}>ATVA</span>
        </div>
        <a href="/" className="header-button">
          <strong className="header-plus-sign">&#43;</strong> New Meeting
        </a>
      </div>
    );
  }
}

export default Header;
