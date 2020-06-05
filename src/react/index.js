import {
    TEXT,
    REACT_ELEMENT,
    CLASS_COMPONENT,
    FUNCTION_COMPONENT,
    REACT_CONTEXT_TYPE,
    REACT_PROVIDER_TYPE,
} from './constants';
import {
    ReactElement,
    compareTwoElement
} from './ReactElement';
import {onlyOne, flatten} from './utils'

function createElement(type, config = {}, ...children) {
    // 编译后产生的属性，基本没什么用
    let key, ref, props = {};
    if (config) {
        delete config.__source;
        delete config.__self;
        delete config.__store;
        ({
            key,
            ref,
            ...props
        } = config);
    }
    let $$typeof;
    if (typeof type === 'string') {
        $$typeof = REACT_ELEMENT;
    } else if (typeof type === 'function' && type.prototype && type.prototype.isComponent) {
        $$typeof = CLASS_COMPONENT;
    } else if (typeof type === 'function') {
        $$typeof = FUNCTION_COMPONENT;
    }
    children = flatten(children);
    props.children = children.map(child => {
        if (typeof child === 'object' || typeof child === 'function') {
            return child;
        } else {
            return {
                $$typeof: TEXT,
                type: 'text',
                children: child + '',
            };
        }
    });
    return ReactElement($$typeof, type, key, ref, props);
}
export const updateQueue = {
    updaters: [],
    isPending: false, // 是否批量更新
    add(updater) {
        this.updaters.push(updater);
    },
    batchUpdate() {
        const {
            updaters
        } = this;
        let updater;
        while ((updater = updaters.pop())) {
            updater.updateComponent();
        }
    }
}
class Updater {
    constructor(component) {
        this.component = component;
        this.pendingStates = [];
        this.nextProps = null;
        this.preState = null;
        this.preProps = null;
    }
    addState(partialState, callback) {
        if ((typeof partialState !== 'object' && typeof partialState !== 'function') || partialState === null) {
            throw new Error('Expected first argument passed to setState is a object or function');
        }
        this.pendingStates.push(partialState);
        this.emitUpdate();
    }
    emitUpdate(nextProps) { // 可能会传递一个新的属性对象。
        nextProps && (this.nextProps = nextProps);
        // 如果传递新的属性对象或当前非批量更新状态的话就直接更新
        if (nextProps || !updateQueue.isPending) {
            this.updateComponent();
        } else {
            updateQueue.add(this);
        }
    }
    updateComponent() {
        const {
            component,
            pendingStates,
            nextProps
        } = this;
        this.preProps = component.props;
        this.preState = component.state;
        if (nextProps || pendingStates.length > 0) {
            shouldUpdate(component, nextProps, this.getState());
        }
    }
    getState() {
        const {
            component,
            pendingStates,
        } = this;
        let {
            state,
            props
        } = component;
        if (pendingStates.length > 0) {
            for (const partialState of pendingStates) {
                if (typeof partialState === 'function') {
                    state = partialState.call(component, state, props);
                }
                state = Object.assign(state, partialState);
            }
            this.pendingStates.length = 0;
        }
        return state;
    }
}

function shouldUpdate(component, nextProps, nextState) {
    nextProps && (component.props = nextProps);
    component.state = nextState;
    const {
        state,
        props
    } = component;
    if (typeof component.componentWillReceiveProps === 'function') {
        component.componentWillReceiveProps(props);
    }
    if (typeof component.shouldComponentUpdate === 'function' && !component.shouldComponentUpdate(props, state)) {
        return false;
    }
    component.forceUpdate();
}
class Component {
    static contextType = null;
    constructor(props={}, context) {
        this.props = props;
        this.context = context;
        this.$updater = new Updater(this);
        this.state = {};
        this.nextProps = null;
    }
    setState(partialState, callback) {
        this.$updater.addState(partialState, callback);
    }
    forceUpdate() { // 进行组件实际的更新
        const {
            props,
            state,
            renderElement: oldRenderElement,
            $updater: {
                preProps,
                preState,
            }
        } = this;
        if (typeof this.componentWillUpdate === 'function') {
            this.componentWillUpdate(props, state);
        }
        const newRenderElement = this.render();
        const currentElement = compareTwoElement(oldRenderElement, newRenderElement);
        this.renderElement = currentElement;
        let snapshot;
        if (typeof this.getSnapshotBeforeUpdate === 'function') {
            if (typeof this.componentWillUpdate === 'function')
                throw new Error('The new API getSnapshotBeforeUpdate should not used width old API componentWillUpdate at the same time.')
            snapshot = this.getSnapshotBeforeUpdate(preProps, preState);
        }
        if (typeof this.componentDidUpdate === 'function') {
            this.componentDidUpdate(preProps, preState, snapshot);
        }
    }
}
Component.prototype.isComponent = {};

function createRef() {
    return {
        current: null
    };
}
function createContext(defaultValue) {
    class Provider extends Component {
        $$typeof = REACT_PROVIDER_TYPE;
        constructor(props) {
            super(props);
            Provider.value = props.value;
            this.state = null;// 如果通过getDerivedStateFromProps实现的话就需要初始化state,而state为null即可。
        }
        static getDerivedStateFromProps(props){
            Provider.value=props.value;
            return null;
        }
        render() {
            return this.props.children;
        }

    }
    Provider.value = defaultValue;
    class Consumer extends Component {
        render() {
            return onlyOne(this.props.children)(Provider.value);
        }
    }
    return { $$typeof: REACT_CONTEXT_TYPE, Provider, Consumer };
}
const React = {
    createElement,
    Component,
    createRef,
    createContext,
}
export {
    createElement,
    Component,
    createRef,
    createContext,
};
export default React;