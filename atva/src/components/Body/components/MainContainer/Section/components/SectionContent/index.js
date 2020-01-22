import React, { Component } from 'react';
import classNames from 'classnames';
import './style.css';

class SectionContent extends Component {
  render() {
    const { data, isEditable, onEdit } = this.props;

    return (
      <div
        className={classNames('section-content', this.props.className, {
          'section-content--editable': isEditable
        })}
      >
        <div className='section-content__text'>{data.content}</div>
        {isEditable && (
          <span className='section-content__edit' onClick={onEdit}>
            Edit
          </span>
        )}
      </div>
    );
  }
}

export default SectionContent;
