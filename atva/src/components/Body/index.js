import React, { Component } from "react";
import { withRouter } from "react-router-dom";

import SideBar from "./components/SideBar";
import MainContainer from "./components/MainContainer";

import { parseQueryStringToObj } from "../../utils";

import { initUrlDocument } from "../../utils/fetch";

import jsonpack from "jsonpack/main";

import withS2T from "../Utils/Speech2Text";
import {
  getDocument,
  createSection,
  setText,
  setTags,
  deleteSection,
  generateTags
} from "../../utils/fetch";

import "./style.css";

class Body extends Component {
  constructor(props) {
    super(props);
    const queryString = props.location.search;
    const query = parseQueryStringToObj(queryString);

    let defaultState = {
      sections: [],
      currentSectionId: 0,
      lastRecordedTranscript: "",
      documentId: query.id || null,
      documentTitle: "",
      isRecording: false
    };

    if (query && query.d) {
      const doc = jsonpack.unpack(query.d);
      const keys = Object.keys(doc);
      const item = doc[keys[0]];
      defaultState.sections = JSON.parse(JSON.stringify(item.sections));
      defaultState.sections.shift();
      defaultState.currentSectionId = item.sections.length;
      defaultState.documentId = item.title;
      defaultState.documentTitle = item.title;
      initUrlDocument({[keys[0]]: item})
    }
    this.deleteSection = this.deleteSection.bind(this);
    this.state = defaultState;
  }

  deleteSection(sectionId) {
    const { sections } = this.state;
    const deletedSection = sections.find(
      section => section.sectionId === sectionId
    );

    if (sectionId && deletedSection) {
      deleteSection(sectionId);
      this.setState({
        sections: sections.filter(section => section.sectionId !== sectionId)
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    const urlDocumentId = this.getDocumentIdFromUrl(nextProps);
    if (nextProps.documentId !== urlDocumentId) {
      this.setDocumentId(urlDocumentId);
    }

    if (
      nextProps.lastRecordedTranscript !== this.state.lastRecordedTranscript
    ) {
      this.setState({
        lastRecordedTranscript: nextProps.lastRecordedTranscript
      });
      if (this.state.sections.length === 0) {
        this.createSection();
      } else {
        this.updateSectionText(
          this.state.currentSectionId,
          nextProps.lastRecordedTranscript
        );
      }
    }
  }

  componentDidMount() {
    const { documentId } = this.state;
    if (documentId) {
      getDocument(documentId).then(data => {
        const sections = data && data.sections;
        const title = data && data.title;
        if (sections && title) {
          this.setState({
            documentTitle: title,
            sections: sections.map(section => ({
              sectionId: section.id,
              summary: section.summary,
              text: section.text,
              timestamp: section.timestamp,
              tags: section.tags
            }))
          });
        }
      });
    }
  }

  createSection() {
    const { documentId } = this.state;

    if (documentId) {
      createSection(documentId).then(data => {
        const sectionId = data && data.id;
        const timestamp = data && data.timestamp;

        if (sectionId) {
          this.setState({
            sections: [
              ...this.state.sections,
              { text: "", sectionId, timestamp }
            ],
            currentSectionId: sectionId
          });
        }
      });
    }
  }

  updateSectionText(sectionId, text) {
    if (sectionId && text) {
      const oldSections = Array.from(this.state.sections);
      const lastSection = oldSections[oldSections.length - 1];
      if (lastSection.sectionId === sectionId) {
        this.setState({
          sections: [
            ...oldSections.slice(0, -1),
            {
              ...lastSection,
              text: `${lastSection.text}${text}`
            }
          ]
        });
      }
    }
  }

  editSection = (sectionId, text) => {
    if (sectionId && text) {
      const index = this.state.sections.findIndex(
        section => section.sectionId === sectionId
      );
      const frontSections = this.state.sections.slice(0, index);
      const backSections = this.state.sections.slice(
        index + 1,
        this.state.sections.length
      );
      this.setState({
        sections: [
          ...frontSections,
          {
            ...this.state.sections[index],
            text
          },
          ...backSections
        ]
      });
    }
  }

  saveSection = (sectionId) => {
    const { sections } = this.state;
    const currentSection = sections.find(
      section => section.sectionId === sectionId
    );

    if (currentSection) {
      setText(sectionId, currentSection.text).then(data => {
        const summary = data && data.summary;

        if (summary) {
          this.setSectionSummary(sectionId, summary);
        }
      });
    }
    this.setAllTags();
  }

  getDocumentIdFromUrl = givenProps => {
    const props = givenProps || this.props;
    return parseQueryStringToObj(props.location.search).id;
  };

  setDocumentId = id => {
    this.setState({
      documentId: id
    });
  };

  setSectionSummary = (sectionId, summary) => {
    const { sections } = this.state;
    const orderIndex = sections.findIndex(
      section => section.sectionId === sectionId
    );
    const topSections = sections.slice(0, orderIndex);
    const bottomSections = sections.slice(orderIndex + 1, sections.length);

    this.setState({
      sections: [
        ...topSections,
        { ...sections[orderIndex], summary },
        ...bottomSections
      ]
    });
  };

  setAllTags = () => {
    generateTags(this.state.documentId).then(data => {
      const currentSections = this.state.sections;
      this.setState({
        sections: currentSections.map((section, index) => {
          // console.log('setalltagcallback', section , data.sections, data.sections[section.id], section.id )
          const sectionTags = data.sections[section.sectionId] ? data.sections[section.sectionId].tags : [];
          if (sectionTags) {
            return {
              ...section,
              tags: sectionTags
            };
          } else {
            return section;
          }
        })
      });
    });
  };

  handleStartRecording = () => {
    this.setState({
      isRecording: true
    });
    this.createSection();

    this.props.startRecord();
  };

  handleRecordNext = () => {
    this.saveSection(this.state.currentSectionId);

    this.handleStartRecording();
  };

  handleStopRecording = () => {
    this.saveSection(this.state.currentSectionId);
    this.props.stopRecord();
    this.setState(
      {
        isRecording: false
      },
      this.setAllTags
    );
  };

  handleChangeDocTitle = title => {
    this.setState({
      documentTitle: title
    });
  };

  handleSaveTagsClick = (sectionId, newTags) => {
    const section = this.state.sections.find(s => s.sectionId === sectionId);

    if (section && newTags) {
      setTags(sectionId, newTags);
    }
  };

  render() {
    const { documentId, documentTitle, isRecording, sections } = this.state;

    return (
      <div className="main-body">
        <SideBar
          onChangeDocumentTitle={this.handleChangeDocTitle}
          documentId={documentId}
          documentTitle={documentTitle}
          isRecording={isRecording}
          onStartRecording={this.handleStartRecording}
          onStopRecording={this.handleStopRecording}
          handleRecordNext={this.handleRecordNext}
          setDocumentId={this.setDocumentId}
        />
        <MainContainer
          sections={sections}
          deleteSection={this.deleteSection}
          editSection={this.editSection}
          saveSection={this.saveSection}
          onSaveTagsClick={this.handleSaveTagsClick}
        />
      </div>
    );
  }
}

export default withS2T(withRouter(Body));
