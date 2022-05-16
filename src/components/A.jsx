import React, { Component, createRef } from '../react';
// import React, { Component, createRef } from 'react';
export default class A extends Component {
    constructor(props) {
        super(props);
        this.state = { number: 0 };
        this.someR = createRef();
        console.log('A constructor called!');
    }
    add = () => {
        this.setState({ number: this.state.number + 1 });
        console.log('the someR:', this.someR);
    }
    sub = () => {
        this.setState({ number: this.state.number - 1 });
    }
    // static getDerivedStateFromProps(nextProps, nextState){
    //     console.log('A getDerivedStateFromProps called', nextProps, nextState);
    // }
    componentWillMount() {
        console.log('A componentWillMount called!');
    }
    componentWillReceiveProps() {
        console.log('A componentWillReceiveProps called');
    }
    componentWillUpdate() {
        console.log('A componentWillUpdate called!');
    }
    shouldComponentUpdate(nextProps, nextState) {
        console.log('A shouldComponentUpdate called!', nextState, nextProps);
        if (nextState.number > 2)
            return true;
        return false;
    }
    render() {
        console.log('A render called!');
        return (
            <div>
                <button ref={this.someR} onClick={this.add}>+</button>
                <button onClick={this.sub}>-</button>
                <br />
                number of A:{this.state.number}
                <br />
                A: the grandparents
                <br />
                {this.state.number > 3 ? <B number={this.state.number} /> : null}
            </div>
        )
    }
    componentDidMount() {
        console.log('A componentDidMount called!');
    }
    componentDidUpdate() {
        console.log('A componentDidUpdate called!');
    }
    componentWillUnmount() {
        console.log('A componentWillUnmount called!');
    }
}

class B extends Component {
    constructor(props) {
        super(props);
        this.state = {};
        console.log('B constructor called!');
    }
    componentWillMount() {
        console.log('B componentWillMount called!');
    }
    shouldComponentUpdate(nextProps,nextState) {
        console.log('B shouldComponentUpdate called!');
        if (nextProps.number > 4)
            return true;
        return false;
    }
    render() {
        console.log('B render called!');
        return (
            <div>
                B: the Child
                <br />
            the number from A: {this.props.number}
            </div>
        )
    }
    componentDidMount() {
        console.log('B componentDidMount called!');
    }
    componentWillReceiveProps() {
        console.log('B componentWillReceiveProps called');
    }
    componentWillUpdate() {
        console.log('B componentWillUpdate called!');
    }
    componentDidUpdate() {
        console.log('B componentDidUpdate called!');
    }
    componentWillUnmount() {
        console.log('B componentWillUnmount called!');
    }
}