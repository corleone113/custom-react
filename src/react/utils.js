import {
    addEvent
} from './event';
export function onlyOne(target) {
    return Array.isArray(target) ? target[0] : target;
}
export function setProps(dom, props) {
    for (const key in props) {
        if (key !== 'children') {
            setProp(dom, key, props[key])
        }
    }
}

function setProp(dom, key, value) {
    if (/^on/.test(key)) { // 绑定合成事件
        addEvent(dom, key, value);
    } else if (key === 'style') { // 设置style attribute
        for (const styleName in value) {
            dom.style[styleName] = value[styleName];
        }
    } else {
        dom.setAttribute(key, value);
    }
}
export function flatten(array) { // 展开嵌套数组
    const flattened = [];
    (function flat(array) {
        array.forEach(item => {
            if (Array.isArray(item)) {
                flat(item);
            } else {
                flattened.push(item);
            }
        })
    })(array);
    return flattened;
}
// 删除/更新/添加属性
export function patchProps(dom, oldProps, newProps) {
    for (const key in oldProps) {
        if (key !== 'children') {
            if (oldProps.hasOwnProperty(key) && !newProps.hasOwnProperty(key)) { // 某个属性旧props有而新props没有则说明DOM节点需要删除该属性
                dom.removeAttribute(key);
            }
        }
    }
    for (const key in newProps) {
        if (key !== 'children') {
            if (oldProps[key] !== newProps[key]) // 新props上某个属性值和旧props对应属性值不同则说明DOM节点需要更新/新增该属性
                setProp(dom, key, newProps[key]);
        }
    }
}