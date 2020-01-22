import React, { Fragment } from "react";

const withS2T = (BaseComponent) => {
  return class Speech2Text extends React.Component {
    recognition;
    constructor(props) {
      super(props);
      this.state = {
        currentText: "",
        UIStop: false,
        isPlaying: false,
      };
      this.init();
    }

    init = () => {
      this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      //Define some more additional parameters for the recognition:
      this.recognition.lang = "en-GB";
      //Since from our experience, the highest result is really the best...
      this.recognition.maxAlternatives = 1;

      this.recognition.onspeechend = () => {
        this.recognition.stop();
      }
      this.recognition.onend = () => {
        this.setState({isPlaying: false});
        if (!this.state.UIStop && !this.state.isPlaying){
          this.recognition.start();
        }
      }

      this.recognition.onerror = (error) => {
        console.error(error);
      }

      this.recognition.onstart = () => {
        this.setState({isPlaying: true});
      }

      this.recognition.onresult = (event) => {
        this.setState({ currentText: event.results[0][0].transcript + ". " }) /* Append the result */
      }
    }

    startRecord = () => {
      this.setState({UIStop: false})
      if(!this.state.isPlaying) {
        this.setState({isPlaying: true});
        this.recognition.start();
      }
    }

    stopRecord = () => {
      this.setState({UIStop: true})
      this.recognition.stop();
    }

    render() {
      return (
        <Fragment>
          <BaseComponent
            {...this.props}
            startRecord={this.startRecord}
            stopRecord={this.stopRecord}
            lastRecordedTranscript={this.state.currentText}
          />
        </Fragment>
      );
    }
  };
};

export default withS2T;
