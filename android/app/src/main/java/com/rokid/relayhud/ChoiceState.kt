package com.rokid.relayhud

/** 选择模式纯状态机:高亮在 options 间环形移动,confirm 返回当前项。 */
class ChoiceState(val options: List<String>) {
    var highlight: Int = 0
        private set

    /** dir>0 下移,dir<0 上移,环形回绕。 */
    fun move(dir: Int) {
        if (options.isEmpty()) return
        val n = options.size
        highlight = ((highlight + (if (dir > 0) 1 else -1)) % n + n) % n
    }

    fun confirm(): String = options.getOrElse(highlight) { options.firstOrNull() ?: "" }
}
