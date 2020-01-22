import React, { Component } from "react";
import cx from 'classnames';
import { withRouter } from "react-router-dom";

import { documentUrl } from "../../../../utils";
import { createDocument } from "../../../../utils/fetch";

import withToast from "../../../Toast";

import "./style.css";

class SideBar extends Component {
  urlBoxRef;

  getDocumentUrl = () => {
    const href = window.location.href;

    return href;
  };

  getUrlBoxRef = ref => {
    if (ref) {
      this.urlBoxRef = ref;
    }
  };

  handleChangeTitle = e => {
    const title = e.target.value;

    this.props.onChangeDocumentTitle(title);
  };

  handleCopyButton = () => {
    if (this.urlBoxRef) {
      this.urlBoxRef.select();
      document.execCommand("copy");
      this.props.showToast();
    }
  };

  handleStartRecording = () => {
    const { documentId, documentTitle } = this.props;
    if (documentId) {
      this.props.onStartRecording();
    } else if (documentTitle) {
      createDocument(documentTitle).then(data => {
        console.log("Start Recording...");
        const dochash = data && data.doc_hash;
        if (dochash) {
          // const documentHash = dochash;
          this.props.setDocumentId(dochash);
          this.props.onStartRecording();
          // this.props.history.push(documentUrl(documentHash));
        } else {
          alert("Document cannot be created");
        }
      });
    } else {
      alert("Please write the document's name before starting!");
    }
  };

  handleRecordNext = () => {
    console.log("Recording Next Section...");
    this.props.handleRecordNext();
  };

  handleStopRecording = () => {
    console.log("Stop Recording...");
    this.props.onStopRecording();
  };

  render() {
    const { documentTitle, isRecording } = this.props;

    return (
      <div className="sidebar-container">
        <div className="sidebar">
          <div>
            <div className="sidebar-section">
              <div className="sidebar-label">Meeting Title</div>
              <input
                type="text"
                className="sidebar-input-box"
                value={documentTitle}
                placeholder="Type meeting topic here"
                onChange={this.handleChangeTitle}
              />
            </div>
            <div className="sidebar-section">
              <div className="sidebar-label">Share</div>
              <div className="sidebar-url-container">
                <input
                  type="text"
                  className="sidebar-link-box"
                  readOnly
                  value={this.getDocumentUrl()}
                  ref={this.getUrlBoxRef}
                  onClick={this.handleCopyButton}
                />
              </div>
            </div>
          </div>
          <div className="sidebar-buttons">
            <div className="sidebar-section">
              <button
                className="button sidebar-start-button"
                onClick={
                  isRecording
                    ? this.handleRecordNext
                    : this.handleStartRecording
                }
              >
                {isRecording ? "Record Next Section" : "Start Recording"}
              </button>
            </div>
            <div className="sidebar-section">
              <button
                className={cx("button-red sidebar-start-button", {
                  "button-disabled": !isRecording
                })}
                onClick={this.handleStopRecording}
                disabled={!isRecording}
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default withToast(withRouter(SideBar), "Url Copied to Clipboard!");
