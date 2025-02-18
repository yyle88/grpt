#!/usr/bin/env node

import fs from 'fs'

function rewrite(codePath) {
    if (!codePath) {
        console.error('没有路径参数-请设置文件路径.')
        return
    }
    fs.readFile(codePath, 'utf8', (erx, data) => {
        if (erx) {
            console.error(`读取文件失败: ${erx}`)
            return
        }

        // 进行替换，把逻辑里调用grpc的地方都改为调用http，这样就能避免麻烦啦，毕竟配置代理什么的，还是比较麻烦的
        let newContent = data.replace(/stackIntercept</g, 'executeGrtp<').replace(/UnaryCall</g, 'GrtpPromise<')

        // 判断是否已经存在目标引用，当然假如将来这个文件路径会变的话还得修改这里的代码
        const targetImport = "import { executeGrtp, GrtpPromise } from '@/grpcviahttp/grpcviahttp.ts';"
        const searchImport = 'import type { RpcOptions } from "@protobuf-ts/runtime-rpc";'
        if (!newContent.includes(targetImport)) {
            // 找到指定引用的位置
            const targetIndex = newContent.indexOf(searchImport)
            if (targetIndex !== -1) {
                // 在目标引用的后面添加新的引用
                const insertIndex = targetIndex + searchImport.length
                // 使用数组截取的方法拼接出结果
                newContent = newContent.slice(0, insertIndex) + `\n${targetImport}` + newContent.slice(insertIndex)
            }
        }

        fs.writeFile(codePath, newContent, 'utf8', (erx) => {
            if (erx) {
                console.error(`写入文件失败: ${erx}`)
                return
            }
            console.log('内容替换成功!')
        })
    })
}

// 执行替换的逻辑
// 比如
// 在项目外侧执行: npm run grpcrewrite -- /xxx/src/rpc/rpc_admin_login/admin_login.client.ts
// 就会自动修改这个文件的内容
// 将会把里面的 grpc 请求逻辑替换为 http 请求逻辑，最终使用的是http的接口，grpc的参数和返回类型
const codePath = process.argv[2]
if (codePath) {
    rewrite(codePath)
} else {
    console.error('没有路径参数-请设置文件路径.')
}
