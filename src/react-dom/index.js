import {createDOM} from '../react/ReactElement';
function render(element, container){
    // 把虚拟DOM变成真实DOM
    const dom = createDOM(element);
    // 把真实DOM挂载到container上
    container.append(dom);
}
export default {
    render,
}