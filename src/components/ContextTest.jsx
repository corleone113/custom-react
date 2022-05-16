// import React, { Component } from 'react'
import React, { Component } from '../react'
import someContext from '../someContext';
// import PropTypes from 'prop-types';
class Header extends Component {
    render() {
        return (<someContext.Consumer>
            {(context) => {
                return (
                    <div style={{ border: `5px solid ${context.color}`, padding: '5px' }}>
                        <Title></Title>
                    </div>
                )
            }}
        </someContext.Consumer>)
    }
}
class Title extends Component {
    static contextType = someContext;
    render() {
        return <div style={{ border: '5px solid orange', padding: '5px', color: this.context.color }}>
            Title
            <p>{this.context.age}</p>
        </div>
    }
}
class Main extends Component {
    render() {
        return <div style={{ border: '5px solid blue', padding: '5px' }}>
            Main
            <Content></Content>
        </div>
    }
}
class Content extends Component {
    static contextType = someContext;
    render() {
        console.log('>>>', this.context, someContext);
        return <div style={{ border: '5px solid pink', padding: '5px', color: this.context.color }}>
            Content
            <button onClick={() => this.context.setColor('red')}>变红</button>
            <button onClick={() => this.context.setColor('green')}>变绿</button>
            <p>age:{this.context.color}</p>
        </div>
    }
}
export default class Page extends Component {

    constructor() {
        super();
        this.state = { color: 'gray' };
    }
    setColor = (color) => {
        console.log('>>>> the color:', color, this);
        this.setState({ color });
    }
    render() {
        const context = { color: this.state.color, setColor: this.setColor, age: 23 };
        return (
            <someContext.Provider value={context}>
                <div style={{ border: '5px solid red', padding: '5px' }}>
                    Page
                <Header>Corleone</Header>
                    <Main />
                </div>
            </someContext.Provider>
        )
    }
}
