import React, { Component } from "react";

import withToast from "../../../../../../Toast";

import "./style.css";

class SectionTags extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tags: ""
    };
  }

  componentWillMount() {
    this.setTags();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.section.tags !== this.props.section.tags) {
      this.setTags(nextProps);
    }
  }

  setTags = givenProps => {
    const props = givenProps || this.props;
    const { section } = props;
    let tagString = "";
    if (section.tags) {
      tagString = section.tags.join(" #");
    }
    this.setState({
      tags: tagString ? "#" + tagString : ""
    });
  };

  handleChangeTags = e => {
    this.setState({
      tags: this.state.tags
    });
  };

  handleSaveClick = () => {
    const { section, onSaveClick } = this.props;
    const { tags } = this.state;
    const modifiedTags = tags.replace(/#/g, "").split(" ");

    onSaveClick(section.sectionId, modifiedTags);
    this.props.showToast();
  };

  render() {
    return (
      <div className="section-tags">
        <div className="section-tags__wrapper">
          <div className="section-tags__content">
            <input
              type="text"
              name="tags"
              onChange={this.handleChangeTags}
              value={this.state.tags}
            />
          </div>
          {/* <div className="section-tags__edit">
            <button
              className="button button-save"
              onClick={this.handleSaveClick}
            >
              Save
            </button>
          </div> */}
        </div>
      </div>
    );
  }
}

export default withToast(SectionTags, 'Tags are saved successfully!');
