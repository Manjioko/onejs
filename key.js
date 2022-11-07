window.onload = function() {
    const body = document.body
    // 启动节点解析，从 body节点开始遍历
    parserDom(body)
    const if_instance = new ifEvent()
    const for_instance = new ForEvent()
    // 倒序遍历，因为子元素的 for 重复应该在父元素 for 重复前面完成
    window.xdata = new Proxy({...window.xdata}, {
        get: function (target, key) {
            // console.log(`${key} 被取值了，宿主是:`,target)
            return Reflect.get(target, key)
        },
        set: function (target, key, value) {
            // console.log(`${key} 被赋值为 ${value}`)
            console.log(value)
            if_instance.hiddenSimpleEle(dataList[key][0], value)
            return Reflect.set(target, key, value)
        }
    })
}

// 定义的事件池
const operatorList = {
    for: [],
    if: [],
}

// 数据双向关联池
const dataList = {

}

const domBind = new Map()

// id 生成器
function IDGenerator() {
    return Number(Math
        .random()
        .toString()
        .slice(2))
        .toString(16)
        .replace(/(\D)/g, (_,v) => Math.random() > 0.5 ? v.toUpperCase() : v)
}

// 解析节点,遍历出所有需要 for 的节点，并存入 for_evnet 中
const parserDom = function (el) {
  // 保证 el 是一个 dom 节点
  if (!el  && !el instanceof HTMLElement) return []
  const child_arr = [...el.children]
  // 操作 child_arr 存储对应的数据结构或者做递归处理
  for (let child_el of child_arr) {
    [...child_el.attributes].forEach(item => {
        const key = item.name.slice(2)
        if (operatorList[key]) {
            const value = item.value
            operatorList[key].unshift([child_el, value])
            // data 属性和与之绑定的节点关联起来
            if (dataList[value]) {
                dataList[value].includes(child_el) || dataList[value].push(child_el)
            } else {
                dataList[value] = [child_el]
            }
            // 每个节点拢共有多少个自定义  operator, 记录下来
            if(!domBind.has(child_el)) {
                domBind.set(child_el,[])
                domBind.get(child_el).push(key)
            } else {
                domBind.get(child_el).push(key)
            }
        }
    })
    // 发现节点存在子节点则递归
    if (child_el.children.length) {
      parserDom(child_el)

    }
  }
}


class ifEvent {
    constructor() {
        this.hiddenEle()
    }

    hiddenEle() {
        const if_arr = operatorList.if
        for (let [key, value] of if_arr) {
            const isShow = window?.xdata[value]
            if(!isShow) {
                key.style.display = 'none'
            }
        }
    }

    hiddenSimpleEle(el, isShow) {
        if (isShow) el.style.display = 'block'
        else  el.style.display = 'none'
    }
}


class ForEvent {
    constructor(body) {
        // dom body 节点
        this.body = body
        this.entry()
    }

    // 程序入口，执行 for 操作
    entry() {
        // 启动节点解析，从 body节点开始遍历
        const arr_dom = operatorList.for
        // 倒序遍历，因为子元素的 for 重复应该在父元素 for 重复前面完成
        for (let [key, value] of arr_dom) {
            this.insertToHtml(key, value)
        }
    }

    // 将节点插入其父节点中，time 表示重复节点数
    insertToHtml(el, time) {
        
        if(!el && !time) return
        // 遍历之前应该删掉 :for 属性，因为重复后，for 已经不需要了
        el.setAttribute('x-id',IDGenerator())
        const parent = el.parentNode
        for (let i = 1; i < +time; i++) {
        const new_el = el.cloneNode(true)
        parent.insertBefore(new_el, el)
        }
    }
}


// 发布订阅实现
class EventEmiter {
  constructor() {
      // 事件池
      this.list = {}
  }

  // 发布
  emit() {
      // 拿到发布的主题名称
      let args = [...arguments]
      const event = args.shift()
      // 从事件池中取出所有关于 event 主题订阅的函数
      const fns = [...this.list[event]]
      if(!fns || !fns.length) return

      for (const fn of fns) {
          // 依次执行 fn
          fn.apply(this, args)
      }

      return this
  }

  // 订阅一次
  once(event, fn) {
      function handleFn() {
          this.off(event, handleFn)
          fn.apply(this, arguments)
      }
      this.on(event,handleFn)
  }
  
  // 取消订阅
  off(event, fn) {
      // 从事件池中取出所有关于 event 主题订阅的函数
      const fns = this.list[event]
      if(!fns) return

      // 分两种情况 1. off 第二个参数 fn 不存在的情况下，就清空 event 主题的所有函数(取消订阅所有事件)
      // off 第二参数存在，则从 list[evnet] 事件池中找出和第二个参数 fn 一样的函数，删掉它就可以了
      if (!fn) {
          fns.length = 0
      } else {
          for (let i = 0; i < fns.length; i++) {
              if (fns[i] === fn) {
                  fns.splice(i, 1)
                  break
              }
          }
      }

  }

  // 订阅
  on(event, fn) {

      // 查看事件池 list 中是否存在 event, 没有则证明没有订阅过
      // 没有订阅过就创建一个数组存放
      if (this.list[event]) {
          this.list[event].push(fn)
      } else {
          this.list[event] = []
          this.list[event].push(fn)
      }

      return this
  }

}