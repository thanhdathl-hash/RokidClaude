package com.rokid.relayhud

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SilenceDetectorTest {
    private fun det() = SilenceDetector(speechThreshold = 1000, silenceMs = 1800, maxMs = 30000)

    @Test fun noSpeechYetNeverAutoStops() {
        val d = det(); d.start(0)
        assertFalse(d.feed(100, 500))
        assertFalse(d.feed(100, 5000))
    }
    @Test fun speechThenSilenceStops() {
        val d = det(); d.start(0)
        assertFalse(d.feed(3000, 100))      // 说话
        assertFalse(d.feed(50, 1000))       // 静音 0.9s,未到
        assertTrue(d.feed(50, 2000))        // 距最后一次说话 1.9s ≥ 1.8s → 停
    }
    @Test fun silenceBeforeSpeechIgnored() {
        val d = det(); d.start(0)
        assertFalse(d.feed(50, 2500))       // 还没说过话,静音再久也不停
    }
    @Test fun maxCapStops() {
        val d = det(); d.start(0)
        assertTrue(d.feed(3000, 30000))     // 到硬上限 → 停
    }
}
