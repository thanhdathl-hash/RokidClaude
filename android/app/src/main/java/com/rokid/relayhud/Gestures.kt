package com.rokid.relayhud

import android.view.KeyEvent

/** 眼镜可用的手势(真机实测仅这几种能进 app)。 */
enum class GestureAction { TAP, SCROLL_UP, SCROLL_DOWN }

/**
 * 触控板键码 → 手势(只在 ACTION_UP 触发)。
 * 单击=ENTER→TAP;后滑=DPAD_LEFT→上滚;前滑=DPAD_RIGHT→下滚。
 * 双击=BACK 不映射(返回 null,放行系统退出);前后滑尾随的 DPAD_UP/DOWN 忽略。
 * 长按/镜腿键被系统占用(助手/相机),根本不到这里。
 */
object Gestures {
    fun map(keyCode: Int, action: Int): GestureAction? {
        if (action != KeyEvent.ACTION_UP) return null
        return when (keyCode) {
            KeyEvent.KEYCODE_ENTER -> GestureAction.TAP
            KeyEvent.KEYCODE_DPAD_LEFT -> GestureAction.SCROLL_UP
            KeyEvent.KEYCODE_DPAD_RIGHT -> GestureAction.SCROLL_DOWN
            else -> null
        }
    }
}
