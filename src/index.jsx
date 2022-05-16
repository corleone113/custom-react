// import React, { Component } from "react";
// import ReactDOM from "react-dom";

import React, { Component } from './react';
import ReactDOM from './react-dom';
import Counter from "./components/Couter";
import A from "./components/A";
import ContextTest from "./components/ContextTest";

const onClick = () => {
  console.log(`I'm corleone xiao!!`);
};
// const element = React.createElement('button', { id: 'xiao', onClick }, 'my name', React.createElement('span', { style: { color: 'red' } }, ' is?'))
const element = (
  <button id="xiao" onClick={onClick}>
    my name
    <span style={{ color: "red" }}> is?</span>
    <span></span>
  </button>
);
const FunctionComp = (props) => {
  const onClick = () => console.log("Function Comopnent clicked!!", props);
  return <button onClick={onClick}>function button</button>;
};
class ClassComp extends Component {
  onClick = () => console.log("Class Comopnent clicked!!", this.props);
  render() {
    return <button onClick={this.onClick}>class button</button>;
  }
}
// const element = 'fldksj';
ReactDOM.render(
  <div>
    <Counter id="er5j" />
    <ContextTest />
    <A />
  </div>,
  document.getElementById("root")
);

console.log(
  "the element:",
  element,
  <FunctionComp />,
  <ClassComp />,
  <Counter />,
  <A />,
  <ContextTest />
);
