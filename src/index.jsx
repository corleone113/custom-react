import React from 'react';
import ReactDOM from 'react-dom';
const onClick = () => { console.log(`I'm corleone xiao!!`) };
const element = React.createElement('button', { id: 'xiao', onClick }, 'my name', React.createElement('span', { style: { color: 'red' } }, ' is?'))
ReactDOM.render(
  <React.StrictMode>
    {element}
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
