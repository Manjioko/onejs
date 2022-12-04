import bus from './eventBus.js'
import { print } from '../utils/func.js'
import { deepProxy, flatObjectFrom2Level } from './dataProxy.js'
function dataBind() {
    window.$data = deepProxy(window.$data)
    window.$flat = flatObjectFrom2Level(window.$data)
    // forDataBind 必须在数据做完代理后调用，因为
    // forDataBind 函数内部依赖 window.$flat
    forDataBind()
}
function forDataBind() {
    Object
    .keys(window.$forStruct)
    .forEach(key => {
        bus.on(key, function(data) {
            print('bus on is ' + key, data)
        })
    })
}
export default dataBind