import React from "react";

import "./style.css";

class SectionTextArea extends React.Component {
  textAreaRef;

  componentDidMount() {
    if (this.textAreaRef) {
      this.textAreaRef.addEventListener("blur", this.props.onBlur);
      this.textAreaRef.focus();
    }
  }

  componentWillUnmount() {
    if (this.textAreaRef) {
      this.textAreaRef.removeEventListener("blur", this.props.onBlur);
    }
  }

  getTextAreaRef = ref => {
    if (ref) {
      this.textAreaRef = ref;
    }
  };

  render() {
    const { text, onChangeText } = this.props;

    return (
      <div className="section-text-area">
        <textarea
          value={text}
          onChange={onChangeText}
          className="section-text-area__box"
          ref={this.getTextAreaRef}
        />
      </div>
    );
  }
}

export default SectionTextArea;
