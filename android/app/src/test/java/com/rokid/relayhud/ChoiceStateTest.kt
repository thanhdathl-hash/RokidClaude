package com.rokid.relayhud

import org.junit.Assert.assertEquals
import org.junit.Test

class ChoiceStateTest {
    private val opts = listOf("允许一次", "允许且不再问", "拒绝")

    @Test fun startsHighlightingFirst() {
        assertEquals(0, ChoiceState(opts).highlight)
    }
    @Test fun moveDownAndUpClampsWithWrap() {
        val s = ChoiceState(opts)
        s.move(1); assertEquals(1, s.highlight)
        s.move(1); assertEquals(2, s.highlight)
        s.move(1); assertEquals(0, s.highlight)   // 回绕
        s.move(-1); assertEquals(2, s.highlight)  // 反向回绕
    }
    @Test fun confirmReturnsHighlightedOption() {
        val s = ChoiceState(opts); s.move(1)
        assertEquals("允许且不再问", s.confirm())
    }
}
