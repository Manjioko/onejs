// 发布订阅
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
        if(!this.list[event]) return
        // console.log('event name is >>>>>', event)
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

const bus = new EventEmiter()
window.$bus = bus

export default bus