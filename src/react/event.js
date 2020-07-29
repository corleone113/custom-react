/**
 * React中事件绑定是按照推荐方式进行的——绑定到document上
 * @param {*} dom 要绑定事件的DOM节点
 * @param {*} eventType 事件的类型
 * @param {*} listener 事件处理函数
 */
export function addEvent(dom, eventType, listener) {
    eventType = eventType.toLowerCase(); // 驼峰命名转换为正确的格式
    // 在绑定事件处理函数的DOM节点上挂载一个事件函数仓库
    const eventStore = dom.eventStore || (dom.eventStore = {});
    eventStore[eventType] = listener; // 将监听器存放在事件函数仓库中
    document.addEventListener(eventType.slice(2), dispatchEvent, false);
}
let syntheticEvent;

function dispatchEvent(event) { // event就是原生DOM事件对象
    let {
        type,
        target
    } = event;
    const eventType = 'on' + type;
    // 初始化syntheticEvent
    initSyntheticEvent(event);
    // 模拟事件冒泡
    while (target) {
        const {
            eventStore
        } = target;
        const listener = eventStore && eventStore[eventType];
        if (listener) {
            listener(syntheticEvent);
        }
        target = target.parentNode;
    }
    for (const key in syntheticEvent) { // 冒泡结束后清空syntheticEvent的属性，之后再传递syntheticEvent都拿不到执行时的属性了。
        if (key !== 'persist') {
            delete syntheticEvent[key];
        }
    }
}

function persist() {
    syntheticEvent = { // syntheticEvent指向另外的对象，就无法清除原对象上的事件对象属性了
        persist
    };
}

function initSyntheticEvent(nativeEvent) { // 初始化合成事件对象
    if (!syntheticEvent) { // 初次调用时初始化syntheticEvent
        syntheticEvent = {
            persist
        };
    }
    syntheticEvent.nativeEvent = nativeEvent;
    syntheticEvent.currentTarget = nativeEvent.target;
    for (const key in nativeEvent) { // 从原始事件对象上拷贝属性
        if (typeof nativeEvent[key] === 'function') {
            syntheticEvent[key] = nativeEvent[key].bind(nativeEvent);
        } else {
            syntheticEvent[key] = nativeEvent[key];
        }
    }
}