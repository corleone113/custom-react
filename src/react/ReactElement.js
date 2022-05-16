import {
  TEXT,
  REACT_ELEMENT,
  CLASS_COMPONENT,
  FUNCTION_COMPONENT,
  MOVE,
  REMOVE,
  INSERT,
} from "./constants";
import {
  onlyOne,
  setProps,
  patchProps,
  injectListener,
  isText,
  injectLifecycle,
} from "./utils";
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
  // 基于传入的React元素创建DOM节点
  element = onlyOne(element); // 只渲染第一个子组件
  if (element == null || typeof element === "boolean") {
    // 处理null/undefined/boolean类型的值
    return document.createTextNode("");
  }
  const { $$typeof } = element;
  let dom = null;
  if (isText(element) || $$typeof === TEXT) {
    // 处理文本React元素
    dom = document.createTextNode(element.children);
  } else if ($$typeof === REACT_ELEMENT) {
    // 处理HTML元素React元素
    dom = createNativeDOM(element);
  } else if ($$typeof === FUNCTION_COMPONENT) {
    // 处理函数组件React元素
    dom = createFunctionComponentDOM(element);
  } else if ($$typeof === CLASS_COMPONENT) {
    // 处理类组件React元素
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
    props: { children },
    ref,
    updaters,
  } = element;
  const dom = document.createElement(type);
  updaters && injectListener(updaters, props); // 劫持事件监听器，让其支持批量延迟更新(state)
  // 创建此DOM节点的子节点
  createDOMChildren(dom, children, updaters);
  // 给该DOM节点添加attributes
  setProps(dom, props);
  if (ref) {
    // 挂载ref
    ref.current = dom;
  }
  return dom;
}

function createDOMChildren(parentNode, children, updaters) {
  children &&
    children.forEach((child, index) => {
      // 为child添加_mountIndex属性，表示其在父节点中的位置，在dom-diff中有重要的作用。
      if (child != null) {
        // 可能为null
        updaters && (child.updaters = updaters.slice());
        child._mountIndex = index; // 进行diff时会用到
        const childDOM = createDOM(child); // 创建子节点的真实DOM节点
        parentNode.appendChild(childDOM);
      }
    });
}

function createFunctionComponentDOM(element) {
  const { type: FunctionComponent, props, updaters } = element;
  const renderElement = FunctionComponent(props); // 执行函数组件得到渲染结果
  element.renderElement = renderElement; // 将渲染结果保存在renderElement属性上
  updaters && (renderElement.updaters = updaters.slice());
  const newDOM = createDOM(renderElement); // 基于渲染结果创建DOM节点
  return newDOM;
}

function createClassComponentDOM(element) {
  const { type: ClassConstructor, props, ref, updaters } = element;
  const { getDerivedStateFromProps, contextType } = ClassConstructor;
  const initialContext = contextType ? contextType.Provider.value : contextType; // 获取context
  const componentInstance = new ClassConstructor(props, initialContext); // 创建组件实例
  injectLifecycle(componentInstance); // 劫持部分生命周期方法——让它们支持批量延迟更新。
  componentInstance.ban = false; // 解除限制，现在开始可以使用setState了。
  if (ref) {
    // 挂载ref——通过ref.current可以获取该类组件实例了。
    ref.current = componentInstance;
  }
  const { componentWillMount, componentDidMount, state, $updater } =
    componentInstance;
  if (updaters) updaters.push(componentInstance.$updater);
  else element.updaters = [$updater];
  if (typeof getDerivedStateFromProps === "function") {
    if (typeof componentWillMount === "function") {
      throw new Error(
        "The new API getDerivedStateFromProps should not used width old API componentWillMount at the same time."
      );
    }
    const nextState = ClassConstructor.getDerivedStateFromProps(props, state);
    if (typeof nextState !== "object") {
      throw new Error(
        "Expected the return value of getDerivedStateFromProps is null or object"
      );
    }
    if (nextState !== null) {
      componentInstance.state = nextState;
    }
  }
  if (typeof componentWillMount === "function") {
    componentInstance.componentWillMount();
  }
  element.componentInstance = componentInstance; // 在类组件生成的虚拟DOM对象上添加指向对应的组件实例的属性
  const renderElement = componentInstance.render();
  renderElement.updaters = element.updaters.slice(); // 拷贝updater数组，这个数组会传递给所有子节点(React元素)
  componentInstance.renderElement = renderElement; // 在类组件实例上添加指向渲染出的虚拟DOM对象，用于下一次dom-diff比对使用。
  const newDOM = createDOM(renderElement); // 基于渲染结果创建DOM节点
  if (typeof componentDidMount === "function") {
    componentInstance.componentDidMount();
  }
  return newDOM;
}

export function compareTwoElement(oldElement, newElement) {
  let currentDOM = oldElement.dom; // 复用DOM节点
  if (newElement == null) {
    // 条件渲染
    const {
      componentInstance: instance,
      componentInstance: { componentWillUnmount },
    } = oldElement;
    if (typeof componentWillUnmount === "function") {
      // 移除前先卸载组件实例
      instance.ban = true;
      instance.componentWillUnmount();
      delete oldElement.componentInstance;
    }
    currentDOM.parentNode.removeChild(currentDOM); // 移除对应的DOM节点
    currentDOM = null; // 释放占用的内存空间
  } else if (
    (!isText(oldElement) && isText(newElement)) ||
    oldElement.type !== newElement.type
  ) {
    // 变为数字/字符串或类型不同则直接进行替换
    const newDOM = createDOM(newElement); // 创建新的DOM节点
    currentDOM.parentNode.replaceChild(newDOM, currentDOM);
  } else {
    // 其它情况进行比对——使用diff算法
    updateElement(oldElement, newElement);
  }
  return newElement;
}

export function updateElement(oldElement, newElement) {
  // 这里的比较的两个React元素的$$typeof肯定是相同的，所以只需要判断一个
  const { dom, updaters, componentInstance } = oldElement;
  newElement.dom = dom;
  newElement.updaters = updaters;
  newElement.componentInstance = componentInstance;
  const currentDOM = oldElement.dom; // 复用DOM节点
  if (
    oldElement.$$typeof === TEXT &&
    oldElement.children !== newElement.children
  ) {
    // 文本内容变化了则直接修改文本内容{ // 处理文本节点
    currentDOM.textContent = newElement.children;
  } else if (oldElement.$$typeof === REACT_ELEMENT) {
    // 处理HTML元素
    updaters && injectListener(oldElement.updaters, newElement.props);
    updateDOMProperties(currentDOM, oldElement.props, newElement.props); // 先更新attribute
    // 递归更新子元素
    updateChildrenElements(
      currentDOM,
      oldElement.props.children,
      newElement.props.children
    ); // 比对子节点
  } else if (oldElement.$$typeof === FUNCTION_COMPONENT) {
    // 处理函数组件
    updateFunctionComponent(oldElement, newElement);
  } else if (oldElement.$$typeof === CLASS_COMPONENT) {
    // 处理类组件
    updateClassComponent(oldElement, newElement);
  }
}

function updateDOMProperties(dom, oldProps, newProps) {
  // 更新props——更新attribute
  patchProps(dom, oldProps, newProps);
}

function updateFunctionComponent(oldElement, newElement) {
  // 更新函数组件
  // 拿到老元素(虚拟DOM对象)
  const oldRenderElement = oldElement.renderElement;
  // 生成新元素
  const newRenderElement = newElement.type(newElement.props);
  newElement.renderElement = newRenderElement;
  // 递归地去进行更新
  updateElement(oldRenderElement, newRenderElement);
}

function updateClassComponent(oldElement, newElement) {
  const {
    componentInstance,
    componentInstance: { $updater },
    type: { contextType },
  } = oldElement; // 获取旧组件实例、构造函数等。
  if (contextType) {
    // 更新context
    componentInstance.context = contextType.Provider.value;
  }
  $updater.emitUpdate(newElement.props); // 进行后续更新流程
}

function updateChildrenElements(
  parentNode,
  oldChildrenElements,
  newChildrenElements
) {
  ++updateDepth; // 每进入新的一层子节点就加一。
  diff(parentNode, oldChildrenElements, newChildrenElements, diffQueue); // diff过程中遇到可复用节点会调用updateElement去更新复用的旧节点，深度优先就体现在这里
  --updateDepth; // 完成dom-diff回到上一层，则减一。
  if (updateDepth === 0) {
    // 说明回到了最上面一层，深度优点的遍历和比对已经完成，这时才进行打补丁
    patch(diffQueue);
    diffQueue.length = 0; // 重置补丁对象数组
  }
}

function patch(diffQueue) {
  const deleteMap = {}; // 缓存移动时删除的节点(移动操作时会先删除再删除)
  const deleteChildren = []; // 保存待删除的节点
  for (const difference of diffQueue) {
    if (difference.type === MOVE || difference.type === REMOVE) {
      //先将type为MOVE/REMOVE的变更对应的节点删除。
      const { fromIndex, parentNode } = difference;
      const oldChildDOM = parentNode.childNodes[fromIndex]; // 通过fromIndex获取待删除的节点
      deleteMap[fromIndex] = oldChildDOM; // 为了插入时复用方便后面复用。
      deleteChildren.push(oldChildDOM);
    }
  }
  deleteChildren.forEach((childDOM) => {
    // 遍历进行删除操作
    childDOM && childDOM.parentNode.removeChild(childDOM);
  });
  for (const { type, parentNode, fromIndex, toIndex, dom } of diffQueue) {
    switch (type) {
      case INSERT:
        parentNode.insertBefore(dom, parentNode.children[toIndex]);
        break;
      case MOVE:
        parentNode.insertBefore(
          deleteMap[fromIndex],
          parentNode.children[toIndex]
        );
        break;
      default:
        break;
    }
  }
}

function diff(parentNode, oldChildrenElements, newChildrenElements) {
  const oldChildrenElementMap = getOldChildrenElementMap(oldChildrenElements);
  let lastIndex = 0; // 标记新子节点数组中最近一个不需要移动的子节点的索引
  for (let i = 0; i < newChildrenElements.length; ++i) {
    const newChildElement = newChildrenElements[i];
    if (newChildElement) {
      const newKey = (newChildElement && newChildElement.key) || i.toString(); // 优先使用key prop作为key
      const oldChildElement = oldChildrenElementMap[newKey];
      if (oldChildElement && oldChildElement.type === newChildElement.type) {
        updateElement(oldChildElement, newChildElement); // 调用updateElement更新旧节点，深度优先遍历发生这里
        const { _mountIndex } = oldChildElement;
        if (_mountIndex < lastIndex) {
          // 小于lastIndex，则移动到新数组中对应的索引位置
          diffQueue.push({
            // 存放补丁对象
            parentNode,
            type: MOVE, // 补丁类型
            fromIndex: _mountIndex,
            toIndex: i,
          });
        } else {
          // 大于或等于lastIndex则不需要移动，此时更新lastIndex为_mountIndex。
          lastIndex = _mountIndex;
        }
        delete oldChildrenElementMap[newKey];
      } else {
        // 找不到可复用节点则直接插入新节点
        diffQueue.push({
          // 存放补丁对象
          parentNode,
          type: INSERT, // 补丁类型k
          toIndex: i,
          dom: createDOM(newChildElement),
        });
      }
      newChildElement._mountIndex = i; // 最后不管有没有复用将该节点的_mountIndex更新为新的索引位置
    }
  }
  for (const key in oldChildrenElementMap) {
    // 新子节点数组不存在的节点直接删除
    const oldChildElement = oldChildrenElementMap[key]; // 有可能为null——条件渲染导致
    diffQueue.push({
      parentNode,
      type: REMOVE,
      fromIndex: (oldChildElement && oldChildElement._mountIndex) || key,
    });
  }
}

function getOldChildrenElementMap(oldChildrenElements) {
  // 返回key到旧节点的映射表
  const oldChildrenElementMap = {};
  for (let i = 0; i < oldChildrenElements.length; ++i) {
    const oldKey =
      (oldChildrenElements[i] && oldChildrenElements[i].key) || i.toString(); // 优先使用key prop，不存在则使用数字索引
    oldChildrenElementMap[oldKey] = oldChildrenElements[i];
  }
  return oldChildrenElementMap;
}
