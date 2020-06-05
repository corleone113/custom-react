import {
    TEXT,
    REACT_ELEMENT,
    CLASS_COMPONENT,
    FUNCTION_COMPONENT,
    MOVE,
    REMOVE,
    INSERT
} from './constants';
import {
    onlyOne,
    setProps,
    patchProps
} from './utils'
let updateDepth = 0;
const diffQueue = [];
export function ReactElement($$typeof, type, key, ref, props) {
    const element = {
        $$typeof,
        type,
        key,
        ref,
        props,
    };
    return element;
}
export function createDOM(element) {
    element = onlyOne(element);
    const {
        $$typeof
    } = element;
    let dom = null;
    if (!$$typeof) {
        dom = document.createTextNode(element);
    } else if ($$typeof === TEXT) {
        dom = document.createTextNode(element.children);
    } else if ($$typeof === REACT_ELEMENT) {
        dom = createNativeDOM(element);
    } else if ($$typeof === FUNCTION_COMPONENT) {
        dom = createFunctionCompoonentDOM(element);
    } else if ($$typeof === CLASS_COMPONENT) {
        dom = createClassComponentDOM(element);
    }
    // 虚拟DOM的dom属性指向由它渲染而来的真实DOM
    element.dom = dom;
    return dom;
}

function createNativeDOM(element) {
    const {
        type,
        props,
        props: {
            children,
        },
        ref,
    } = element;
    const dom = document.createElement(type);
    // 创建此DOM节点的子节点
    createDOMChildren(dom, children);
    // 给该DOM节点添加attributes
    setProps(dom, props);
    if (ref) {
        ref.current = dom;
    }
    return dom;
}

function createDOMChildren(parentNode, children) {
    children && children.forEach((child, index) => {
        // 为child添加_mountIndex属性，表示其在父节点中的位置，在dom-diff中有重要的作用。
        if (child !== null) { // 可能为null
            child._mountIndex = index;
            const childDOM = createDOM(child); // 创建字节的真实DOM节点
            parentNode.appendChild(childDOM);
        }
    })
}

function createFunctionCompoonentDOM(element) {
    const {
        type: FunctionComponent,
        props
    } = element;
    const renderElement = FunctionComponent(props);
    element.renderElement = renderElement;
    const newDOM = createDOM(renderElement);
    return newDOM;
}

function createClassComponentDOM(element) {
    const {
        type: ClassConstructor,
        props,
        ref,
    } = element;
    const {
        getDerivedStateFromProps,
        contextType
    } = ClassConstructor;
    const initContext = contextType ? contextType.Provider.value : contextType;
    const componentInstance = new ClassConstructor(props, initContext);
    if (ref) {
        ref.current = componentInstance;
    }
    const {
        componentWillMount,
        componentDidMount,
        state,
    } = componentInstance;
    if (typeof getDerivedStateFromProps === 'function') {
        if (typeof componentWillMount === 'function') {
            throw new Error('The new API getDerivedStateFromProps should not used width old API componentWillMount at the same time.')
        }
        // ClassConstructor.getDerivedStateFromProps(props, state);
        const nextState = ClassConstructor.getDerivedStateFromProps(props, state);
        if (typeof nextState !== 'object') {
            throw new Error('Expected the return value of getDerivedStateFromProps is null or object');
        }
        if (nextState !== null) {
            componentInstance.state = nextState;
        }
    }
    if (typeof componentWillMount === 'function') {
        componentInstance.componentWillMount();
    }
    element.componentInstance = componentInstance; // 在类组件生成的虚拟DOM对象上添加指向对应的组件实例的属性
    const renderElement = componentInstance.render();
    componentInstance.renderElement = renderElement; // 在类组件实例上添加指向渲染出的虚拟DOM对象，用于下一次dom-diff比对使用。
    const newDOM = createDOM(renderElement);
    if (typeof componentDidMount === 'function') {
        componentInstance.componentDidMount();
    }
    return newDOM;
}

export function compareTwoElement(oldRenderElement, newRenderElement) {
    oldRenderElement = onlyOne(oldRenderElement);
    newRenderElement = onlyOne(newRenderElement);
    let currentDOM = oldRenderElement.dom;
    let currentElement = oldRenderElement;
    if (newRenderElement == null) {
        const {
            componentInstance,
            componentInstance: {
                componentWillUnmount
            }
        } = oldRenderElement
        if (typeof componentWillUnmount === 'function') {
            componentInstance.componentWillUnmount();
        }
        currentDOM.parentNode.removeChild(currentDOM);
        currentDOM = null;
    } else if (oldRenderElement.type !== newRenderElement.type) {
        const newDOM = createDOM(newRenderElement);
        currentDOM.parentNode.replaceChild(newDOM, currentDOM);
        currentElement = newRenderElement;
    } else {
        updateElement(oldRenderElement, newRenderElement);
    }
    return currentElement;
}

function updateElement(oldElement, newElement) {
    let currentDOM = newElement.dom = oldElement.dom;
    if (oldElement.$$typeof === TEXT && newElement.$$typeof === TEXT) {
        if (oldElement.children !== newElement.children) {
            currentDOM.textContent = newElement.children;
        }
    } else if (oldElement.$$typeof === REACT_ELEMENT) {
        updateDOMProperties(currentDOM, oldElement.props, newElement.props);
        // 递归更新子元素
        updateChildrenElements(currentDOM, oldElement.props.children, newElement.props.children);
        oldElement.props = newElement.props;
    } else if (oldElement.$$typeof === FUNCTION_COMPONENT) {
        updateFunctionComponent(oldElement, newElement);
    } else if (oldElement.$$typeof === CLASS_COMPONENT) {
        updateClassComponent(oldElement, newElement);
        newElement.componentInstance = oldElement.componentInstance; // 复用组件实例
    }
}

function updateDOMProperties(dom, oldProps, newProps) {
    patchProps(dom, oldProps, newProps);
}

function updateFunctionComponent(oldElement, newElement) {
    // 拿到老元素(虚拟DOM对象)
    const oldRenderElement = oldElement.renderElement;
    // 生成新元素
    const newRenderElement = newElement.type(newElement.props);
    // 进行比对
    const currentElement = compareTwoElement(oldRenderElement, newRenderElement);
    // 比对结果赋值给新元素
    newElement.renderElement = currentElement;
}

function updateClassComponent(oldElement, newElement) {
    const componentInstance = oldElement.componentInstance; // 获取就得组件实例
    // const oldRenderElement = componentInstance.renderElement;// 上次渲染的react元素
    if(oldElement.type.contextType){
        componentInstance.context = oldElement.type.contextType.Provider.value;
    }
    const updater = componentInstance.$updater;
    const nextProps = newElement.props;
    const {
        componentWillUpdate,
        state
    } = componentInstance;
    const ClassConstructor = Object.getPrototypeOf(componentInstance).constructor;
    const {
        getDerivedStateFromProps
    } = ClassConstructor;
    if (typeof getDerivedStateFromProps === 'function') {
        if (typeof componentWillUpdate === 'function') {
            throw new Error('The new API getDerivedStateFromProps should not used width old API componentWillUpdate at the same time.');
        }
        const nextState = ClassConstructor.getDerivedStateFromProps(nextProps, state);
        if (typeof nextState !== 'object') {
            throw new Error('Expected the return value of getDerivedStateFromProps is null or object');
        }
        if (nextState !== null) {
            componentInstance.state = nextState;
        }
    }
    updater.emitUpdate(nextProps);
}

function updateChildrenElements(dom, oldChildrenElements, newChildrenElements) {
    ++updateDepth; // 没进入新的一层子节点就加一。
    diff(dom, oldChildrenElements, newChildrenElements, diffQueue);
    --updateDepth; // 完成dom-diff回到上一层，则减一。
    if (updateDepth === 0) { // 说明回到了最上面一层，比对已经完成
        patch(diffQueue);
        diffQueue.length = 0;
    }
}

function patch(diffQueue) {
    const deleteMap = {};
    const deleteChildren = [];
    for (let i = 0; i < diffQueue.length; ++i) {
        const difference = diffQueue[i];
        if (difference.type === MOVE || difference.type === REMOVE) { //先将type为MOVE/REMOVE的变更对应的节点删除。
            const {
                fromIndex,
                parentNode
            } = difference;
            const oldChildDOM = parentNode.childNodes[fromIndex];
            deleteMap[fromIndex] = oldChildDOM; // 为了方便后面复用。
            deleteChildren.push(oldChildDOM);
        }
    }
    deleteChildren.forEach(childDOM => {
        childDOM && childDOM.parentNode.removeChild(childDOM);
    })
    for (let i = 0; i < diffQueue.length; ++i) {
        const difference = diffQueue[i];
        const {
            type,
            parentNode,
            fromIndex,
            toIndex,
            dom
        } = difference;
        switch (type) {
            case INSERT:
                insertChildAt(parentNode, dom, toIndex);
                break;
            case MOVE:
                insertChildAt(parentNode, deleteMap[fromIndex], toIndex);
                break;
            default:
                break;
        }
    }
}

function insertChildAt(parentNode, childDOM, toIndex) {
    const oldChild = parentNode.children[toIndex]; // 先取出这个位置旧的DOM节点
    oldChild ? parentNode.insertBefore(childDOM, oldChild) : parentNode.appendChild(childDOM);
}

function diff(parentNode, oldChildrenElements, newChildrenElements) {
    const oldChildrenElementMap = getChildrenElementMap(oldChildrenElements);
    const newChildrenElementMap = getNewChildrenElementMap(oldChildrenElementMap, newChildrenElements);
    let lastIndex = 0;
    for (let i = 0; i < newChildrenElements.length; ++i) {
        const newChildElement = newChildrenElements[i];
        if (newChildElement) {
            const newKey = (newChildElement && newChildElement.key) || i.toString();
            const oldChildElement = oldChildrenElementMap[newKey];
            if (newChildElement === oldChildElement) {
                const {
                    _mountIndex: origIndex
                } = oldChildElement;
                if (origIndex < lastIndex) {
                    diffQueue.push({
                        parentNode,
                        type: MOVE,
                        fromIndex: origIndex,
                        toIndex: i,
                    })
                }
                lastIndex = Math.max(lastIndex, origIndex);
            } else {
                diffQueue.push({
                    parentNode,
                    type: INSERT,
                    toIndex: i,
                    dom: createDOM(newChildElement),
                })
            }
            newChildElement._mountIndex = i;
        }
    }
    for (let oldKey in oldChildrenElementMap) {
        if (!newChildrenElementMap.hasOwnProperty(oldKey)) {
            const oldChildElement = oldChildrenElementMap[oldKey]
            diffQueue.push({
                parentNode,
                type: REMOVE,
                fromIndex: oldChildElement ? oldChildElement._mountIndex : oldKey,
            })
        }
    }
}

function getNewChildrenElementMap(oldChildrenElementMap, newChildrenElements) {
    const newChildrenElementMap = {};
    for (let i = 0; i < newChildrenElements.length; ++i) {
        const newChildElement = newChildrenElements[i];
        if (newChildElement) {
            const newKey = (newChildElement && newChildElement.key) || i.toString();
            const oldChildElement = oldChildrenElementMap[newKey];
            if (canDeepCompare(oldChildElement, newChildElement)) { // 判断是否可复用旧节点
                updateElement(oldChildElement, newChildElement); // 复用旧节点，用新属性更新旧节点
                newChildrenElements[i] = oldChildElement;
            }
            newChildrenElementMap[newKey] = newChildrenElements[i];
        }
    }
    return newChildrenElementMap;
}

function canDeepCompare(oldChildElement, newChildElement) {
    if (oldChildElement && newChildElement) {
        return oldChildElement.type === newChildElement.type;
    }
    return false;
}

function getChildrenElementMap(oldChildrenElements) {
    const oldChildrenElementMap = {};
    for (let i = 0; i < oldChildrenElements.length; ++i) {
        const oldKey = (oldChildrenElements[i] && oldChildrenElements[i].key) || i.toString();
        oldChildrenElementMap[oldKey] = oldChildrenElements[i];
    }
    return oldChildrenElementMap;
}