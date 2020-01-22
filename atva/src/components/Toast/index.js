import React, { Fragment } from "react";
import cx from "classnames";

import './style.css';

const withToast = (BaseComponent, text) => {
  return class Toast extends React.Component {
    constructor(props) {
      super(props);

      this.state = {
        isActive: false,
      };
    }

    showToast = () => {
      this.setState(
        {
          isActive: true
        },
        () => {
          window.setTimeout(() => {
            this.setState({
              isActive: false
            });
          }, 3000);
        }
      );
    };

    render() {
      return (
        <Fragment>
          <div
            className={cx("toast", { "toast--active": this.state.isActive })}
          >
            {text}
          </div>
          <BaseComponent {...this.props} showToast={this.showToast} />
        </Fragment>
      );
    }
  };
};

export default withToast;
