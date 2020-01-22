import React, { Component } from "react";
import cx from "classnames";
import Section from "./Section";
import "./style.css";
class MainContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showRaw: true,
      filterText: ""
    };
  }

  toggleDetail = () => {
    const { showRaw } = this.state;
    this.setState({ showRaw: !showRaw });
  };

  handleChangeFilter = e => {
    const filterText = e.target.value;
    this.setState({ filterText });
  };

  render() {
    const {
      sections,
      deleteSection,
      editSection,
      saveSection,
      onSaveTagsClick
    } = this.props;
    const { showRaw, filterText } = this.state;
    return (
      <div className="sections-container">
        <div className="sections-container__header">
          <input
            type="text"
            className="sections-container__header-input"
            placeholder="Filter ..."
            onChange={this.handleChangeFilter}
          />
          <div>
            <button
              className={cx("button sections-container__header-toggle", {
                "button-disabled": showRaw
              })}
              onClick={this.toggleDetail}
              disabled={showRaw}
            >
              Original Text
            </button>
            <button
              className={cx("button sections-container__header-toggle", {
                "button-disabled": !showRaw
              })}
              onClick={this.toggleDetail}
              disabled={!showRaw}
            >
              Summary
            </button>
          </div>
        </div>
        {sections &&
          sections.length > 0 &&
          sections
            .filter(section => {
              let found = true;
              if (filterText.length > 0) {
                found = false;
                for (let tagIndex in section.tags) {
                  if (section.tags[tagIndex].indexOf(filterText) !== -1) {
                    found = true;
                  }
                }
              }
              return found;
            })
            .map(section => (
              <Section
                section={section}
                deleteSection={deleteSection}
                editSection={editSection}
                saveSection={saveSection}
                key={section.sectionId}
                onSaveTagsClick={onSaveTagsClick}
                showRaw={showRaw}
              />
            ))}
      </div>
    );
  }
}

export default MainContainer;
