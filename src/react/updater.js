const updateQueue = {
    updaters: [],
    add(updater) {
        this.updaters.push(updater);
    },
    batchUpdate() {
        const {
            updaters
        } = this;
        let updater;
        while ((updater = updaters.pop())) { // 批量更新组件
            updater.update();
        }
    }
}
export class Updater {
    constructor(component) {
        this.batching = false; // 表示是否处于批量更新状态
        this.component = component; // 对应的组件
        this.pendingStates = []; // 存放state updater
        this.callbacks = []; // 存放state更新后执行的回调
        this.nextProps = undefined; // 存放新的props
        this.preState = null; // 存放旧的state
        this.preProps = null; // 存放旧的state
    }
    addState(partialState, callback) {
        if ((typeof partialState !== 'object' && typeof partialState !== 'function') || partialState === null) {
            throw new Error('Expected first argument passed to setState is a object or function');
        }
        typeof callback === 'function' && this.callbacks.push(callback);
        this.pendingStates.push(partialState);
        this.emitUpdate();
    }
    emitUpdate(nextProps) { // 可能会传递一个新的属性对象。
        nextProps && (this.nextProps = nextProps);
        // 如果传递新的属性对象(props更新了)或当前非批量更新状态的话就直接更新
        if (nextProps || !this.batching) {
            this.update();
        } else {
            updateQueue.add(this); // 没有传递新的属性对象(没有调用forceUpdate)且处于批量更新状态则将当前updater添加到updateQueue中，稍后更新。
        }
    }
    update() {
        const {
            component,
            pendingStates,
            nextProps
        } = this;
        this.preProps = component.props;
        this.preState = component.state;
        if (nextProps || pendingStates.length > 0) { // 存在this.nextProps说明props更新了；pendingStates.length>0说明调用了setState
            this.updateComponent(component, nextProps);
        }
        this.nextProps = undefined;
    }
    updateComponent(component, nextProps = component.props) {
        component.props = nextProps; // 先更新props
        const {
            pendingStates,
        } = this;
        let {
            state,
            props,
            componentWillReceiveProps,
            shouldComponentUpdate,
        } = component;
        if (pendingStates.length > 0) { // 开始批量更新state
            let updatedState; // 创建变量保存更新结果
            for (const partialState of pendingStates) {
                if (typeof partialState === 'function') { // 如果是函数取其返回值作为更新结果
                    updatedState = partialState.call(component, state, props); // 执行时传入旧的state和新的props
                } else {
                    updatedState = partialState; // 否则直接作为更新结果
                }
                component.state = {
                    ...state,
                    ...updatedState
                }; // 进行合并
            }
            this.pendingStates.length = 0; // 更新数组重置为0
        }
        this.callbacks.forEach(cb => cb()); // 遍历执行传入setState的回调
        this.callbacks.length = 0; // 重置回调数组
        if (typeof componentWillReceiveProps === 'function') {
            batchingInject(this, componentWillReceiveProps.bind(component, props))
        }
        if (typeof shouldComponentUpdate === 'function' && !batchingInject(this, shouldComponentUpdate.bind(component, props, state))) {
            return;
        }
        component.forceUpdate(); // 更新组件
    }
}
export function batchingInject(updater, fn) { // 劫持需要批量更新的函数，函数执行完进行批量更新(state)，并返回函数执行结果
    updater.batching = true; // 打开批量更新状态
    const ret = fn(); // 执行劫持的函数并保存结果
    updater.batching = false; // 关闭批量更新状态
    updateQueue.batchUpdate(); // 进行批量更新
    return ret; // 返回结果
}