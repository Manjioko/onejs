import { print } from "../utils/func.js"

const GlobalVar = {
    dataName: '$data.'
}
// 通过数据属性获取到节点的id
function getForIdfromData(data) {
    print('data is: ', data)
    const idAry = []
    Object
    .entries(window.$forStruct)
    .forEach(([key, value]) => {
        let aryName = value.array
        if (!aryName.startsWith(GlobalVar.dataName)) {
            aryName = GlobalVar.dataName + aryName
        }
        if (data.includes(aryName)) {
            idAry.push(key)
        }
    })
    return idAry
}
// 代理 handle
const handle = Object.freeze({
    get: function (target, key) {
        console.log(`${key} 被取值`)
        return Reflect.get(target, key)
    },
    set: function (target, key, value, receices) {
        console.log(`${key} 被赋值为`,value)
        if (Array.isArray(target)) {
            // 因为数组的 length 也会被触发，但是 length 这个属性的变化
            // 我们并不关心，所以忽略它
            if (key === 'length') return true
            let old_key = $flat.get(receices) || ''
            let abs_key = old_key
            print('111')
            if (!old_key.startsWith(GlobalVar.dataName))
                abs_key = GlobalVar.dataName + old_key
            const idAry = getForIdfromData(abs_key)
            idAry.forEach(id => setTimeout(() => $bus.emit(id, value), 0))
        }
        if ($data[key] !== undefined) {
            let abs_key = key
            print('222')
            if (!key.startsWith(GlobalVar.dataName))
                abs_key = GlobalVar.dataName + key
            const idAry = getForIdfromData(abs_key)
            idAry.forEach(id => setTimeout(() => $bus.emit(id, value), 0))
        }
        if ($flat.get(receices)) {
            print('333')
            const abs_key = `${GlobalVar.dataName}${$flat.get(receices)}.${key}`
            const idAry = getForIdfromData(abs_key)
            idAry.forEach(id => setTimeout(() => $bus.emit(id, value), 0))
        }
        return Reflect.set(target, key, value, receices)
    }
})
// 类型判断
function typeIs(data) {
    return Object.prototype.toString.call(data).slice(8, -1)
}
function deepProxy(target, h = handle) {
    const truthType = typeIs(target)
    // 只做数组和对象的代理
    if (truthType !== 'Object' && truthType !== 'Array') return target

    if (truthType === 'Object') {
        for (let [key, value] of Object.entries(target)) {
            const type = typeIs(value)
            if (type === 'Object' || type === 'Array') {
                target[key] = deepProxy(target[key], handle)
            }
        }
        return new Proxy(target, handle)
    } else {
        target.forEach((item, idx) => {
            const type = typeIs(item)
            if (type === 'Object' || type === 'Array') {
                target[idx] = deepProxy(item, handle)
            }
        })
        return new Proxy(target, handle)
    }
}
// 从字符串字面量取 xdata 值
function getdataFromStr(str) {
    return new Function(`return window.${GlobalVar.dataName}${str}`)()
}
// 将一个数组的多层嵌套模式结构出单层对象的数据模式，返回一个 Map 数据结构
function flatObjectFrom2Level(obj, tmp = {}, name = '') {
    if (typeof obj !== 'object') return obj

    const core = function (name, key) {
        const newName = Array.isArray(obj[name] ?? tmp[name]) ? name + '[' + key + ']' : name + '.' + key
        tmp[newName] = getdataFromStr(newName)
        flatObjectFrom2Level(obj, tmp, newName)
    }
    if (name) {
        Object.keys(tmp[name]).forEach(nk => {
            if (typeof tmp[name][nk] === 'object' && tmp[name][nk] !== null) {
                core(name, nk)
            }
        })
    } else {
        Object.keys(obj).forEach(k => {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                Object.keys(obj[k]).forEach(sk => {
                    if (typeof obj[k][sk] === 'object' && obj[k][sk] !== null) {
                        core(k, sk)
                    }
                })
            }
        })
    }

    const map = new Map()
    Object.keys(tmp).forEach(key => {
        map.set(tmp[key], key)
    })
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            map.set(obj[key], key)
        }
    })
    return map
}

export { deepProxy, flatObjectFrom2Level }