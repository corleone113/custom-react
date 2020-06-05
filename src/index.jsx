// import React from 'react';
// import ReactDOM from 'react-dom';

import React, { Component } from './react';
import ReactDOM from './react-dom';
import Counter from './Couter';
import A from './A';
import ContextTest from './ContextTest'

const onClick = () => { console.log(`I'm corleone xiao!!`) };
// const element = React.createElement('button', { id: 'xiao', onClick }, 'my name', React.createElement('span', { style: { color: 'red' } }, ' is?'))
const element = (
  <button id='xiao' onClick={onClick}>
    my name
    <span style={{ color: 'red' }}> is?</span>
    <span></span>
  </button>
)
// class Button extends Component{
//   render
// }
const FunctionComp = (props) => {
  const onClick = () => console.log('Function Comopnent clicked!!', props);
  return <button onClick={onClick}>function button</button>
}
class ClassComp extends Component {
  onClick = () => console.log('Class Comopnent clicked!!', this.props)
  render(){
    return <button onClick={this.onClick}>class button</button>
  }
}
// const element = 'fldksj';
ReactDOM.render(<ContextTest id='er5j'/>,
  document.getElementById('root')
);

console.log('the element:', element, <FunctionComp />, <ClassComp />, <Counter />, <A />, <ContextTest />);