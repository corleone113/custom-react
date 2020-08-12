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
    compareTwoElement,
} from './ReactElement';
import {
    onlyOne,
    flatten,
    isText,
} from './utils';
import {
    Updater,
} from './updater';

function createElement(type, config = {}, ...children) {
    let key, ref, props = {};
    if (config) {
        // 编译后产生的属性
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
    children = flatten(children); // 默认展开数组
    props.children = children.map(child => {
        // children中的函数或基本类型的值不会被babel转码器转化为createElement调用
        if (typeof child === 'object' || typeof child === 'function') { // children为React元素或函数时直接返回
            return child;
        } else if(isText(child)) { // 目前暂时将基本类型也转化为对象
            return { // 当作React元素
                $$typeof: TEXT,
                type: 'text',
                children: child + '',
            };
        }
        return null;
    });
    return ReactElement($$typeof, type, key, ref, props);
}
class Component {
    static contextType = null;
    constructor(props = {}, context) {
        this.props = props;
        this.context = context;
        this.$updater = new Updater(this); // 创建对应的Updater实例
        this.ban = true; // 构造函数执行期间不能使用setState
        this.state = {};
        this.lifecycleCalled = false; // 避免一些声明周期方法被重复调用
    }
    setState(partialState, callback) {
        !this.ban && this.$updater.addState(partialState, callback);
    }
    forceUpdate() { // forceUpdate方法
        const {
            props,
            state,
            renderElement: oldRenderElement, // 旧的render返回值——渲染结果
            $updater: {
                preProps,
                preState,
            },
            constructor,
            constructor: {
                getDerivedStateFromProps,
            }
        } = this;
        if (typeof getDerivedStateFromProps === 'function' && !this.lifecycleCalled) {
            if (typeof this.componentWillUpdate === 'function' || typeof this.componentWillReceiveProps === 'function') {
                throw new Error('The new API getDerivedStateFromProps should not used width old API componentWillUpdate or componentWillReceiveProps at the same time.');
            }
            const nextState = constructor.getDerivedStateFromProps(props, state);
            if (typeof nextState !== 'object') {
                throw new Error('Expected the return value of getDerivedStateFromProps is null or object');
            }
            if (nextState !== null) {
                this.state = nextState;
            }
        }
        if (typeof this.componentWillUpdate === 'function' && !this.lifecycleCalled) {
            this.componentWillUpdate(props, state);
        }
        const newRenderElement = this.render(); // 获取新的渲染结果
        const currentElement = compareTwoElement(oldRenderElement, newRenderElement); // 比对新旧渲染结果
        this.renderElement = currentElement; // 更新当前实例的renderElement属性
        let snapshot;
        if (typeof this.getSnapshotBeforeUpdate === 'function') {
            if (typeof this.componentWillUpdate === 'function')
                throw new Error('The new API getSnapshotBeforeUpdate should not used width old API componentWillUpdate at the same time.')
            snapshot = this.getSnapshotBeforeUpdate(preProps, preState);
        }
        if (typeof this.componentDidUpdate === 'function') {
            this.componentDidUpdate(preProps, preState, snapshot);
        }
        this.lifecycleCalled = false;
    }
}
Component.prototype.isComponent = {}; // 标识类组件

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
            this.state = null; // 如果通过getDerivedStateFromProps实现的话就需要初始化state,而state为null即可。
        }
        static getDerivedStateFromProps(props) { // 更新Provider.value
            Provider.value = props.value;
            return null;
        }
        render() {
            return onlyOne(this.props.children); // 只渲染一个子组件。
        }

    }
    Provider.value = defaultValue;
    class Consumer extends Component {
        render() {
            return onlyOne(this.props.children)(Provider.value);
        }
    }
    return {
        $$typeof: REACT_CONTEXT_TYPE,
        Provider,
        Consumer
    };
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