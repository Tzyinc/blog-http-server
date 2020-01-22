import React, { Component } from "react";
import { Link } from "react-router-dom";

import "./style.css";

class LandingPage extends Component {
  render() {
    return (
      <div>
        <div className="landing-cover landing-cover-bg">
          <h1 className="landing-cover-header">Meet ATVA. Built by Aaron Tenzy Van Adriel</h1>
          <p className="landing-cover-subtitle">
            Focus on what's important, and let us handle your minutes for you
          </p>
          <Link to="/" className="button landing-enter-button">
            Take Me There
          </Link>
        </div>
        <div className="landing-cover">
          <div className="landing-details-component">
            <div className="landing-details-component-sections">
              <div alt="" className="emoji thinking" />
            </div>
            <div className="landing-details-component-sections">
              <h1>Remember everything</h1>
              <div>
                Have everything in your discussions saved quickly and
                effortlessly. Get all your information in one place, and skim
                through all the information with a summarised version of the
                texts.
              </div>
            </div>
          </div>
          <div className="landing-details-component">
            <div className="landing-details-component-sections">
              <h1>Focus on the important</h1>
              <div>
                Spend less time talking and more time coming up with solutions.
                With our one-click interface you can keep the minutes at the
                back of your mind, instead of worrying about it all the time.
              </div>
            </div>
            <div className="landing-details-component-sections">
              <div alt="" className="emoji arrow" />
            </div>
          </div>
          <div className="landing-details-component">
            <div className="landing-details-component-sections">
              <div alt="" className="emoji magni" />
            </div>
            <div className="landing-details-component-sections">
              <h1>Find what you need fast</h1>
              <div>
                "Sorting is just a lousier search." With our automated tagging
                system you now have an easy way to go back to a long
                conversation and pick up only the parts that are relevant to
                what you need.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default LandingPage;
