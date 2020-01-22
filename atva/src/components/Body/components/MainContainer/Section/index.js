import React, { Component } from "react";
import SectionContent from "./components/SectionContent";
import SectionTextArea from "./components/SectionTextArea";
import SectionTags from "./components/SectionTags";
import moment from "moment";
import "./style.css";

class Section extends Component {
  constructor(props) {
    super(props);

    this.state = {
      editMode: false
    };
  }

  activateEditMode = () => {
    this.setState({
      editMode: true
    });
  };

  deactivateEditMode = () => {
    this.setState({
      editMode: false
    });
  };

  handleEditSection = e => {
    const { section } = this.props;
    const value = e.target.value;

    this.props.editSection(section.sectionId, value);
  };

  handleSaveEditedSection = () => {
    const { section } = this.props;

    this.deactivateEditMode();
    this.props.saveSection(section.sectionId);
  };

  render() {
    const { section, deleteSection, onSaveTagsClick, showRaw } = this.props;
    const { editMode } = this.state;
    const raw = { content: section.text, timestamp: section.timestamp };
    const summary = { content: section.summary, timestamp: section.timestamp };
    const formatTime = moment(raw.timestamp).format("h:mm:ss a");

    return (
      <div className="section">
        <div className="section__header">
          <div className="section__header-time">{formatTime}</div>
          {/* <div
            className="section__header-delete"
            onClick={() => deleteSection(section.sectionId)}
          >
            ✕
          </div> */}
        </div>
        {editMode && (
          <SectionTextArea
            text={section.text}
            onChangeText={this.handleEditSection}
            onBlur={this.handleSaveEditedSection}
          />
        )}
        {!editMode && (
          <SectionContent
            data={raw}
            className={showRaw ? "" : "hidden"}
            isEditable
            onEdit={this.activateEditMode}
          />
        )}
        <SectionContent data={summary} className={showRaw ? "hidden" : ""} />
        <SectionTags section={section} onSaveClick={onSaveTagsClick} />
      </div>
    );
  }
}

export default Section;
