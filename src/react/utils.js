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
    if (/^on/.test(key)) {
        // dom[key.toLowerCase()] = value;
        addEvent(dom, key, value);
    } else if (key === 'style') {
        for (const styleName in value) {
            dom.style[styleName] = value[styleName];
        }
    } else {
        dom.setAttribute(key, value);
    }
}
export function flatten(array) {
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
            if (newProps.hasOwnProperty(key)) {
                dom.removeAttribute(key);
            }
        }
    }
    for (const key in newProps) {
        if (key !== 'children') {
            setProp(dom, key, newProps[key]);
        }
    }
}