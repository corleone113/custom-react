import {createDOM} from '../react/ReactElement';
let oldDom;
function render(element, container){
    // 把虚拟DOM变成真实DOM
    const dom = createDOM(element);
    // 把真实DOM挂载到container上
    if(dom !== oldDom){
        container.append(dom);
        oldDom = dom;
    }else{
        container.replaceChild(dom, oldDom);
    }
}
export default {
    render,
}