package com.rokid.relayhud

/**
 * 纯逻辑:根据每段音频平均振幅 + 时间戳,判断是否该自动停录。
 * 规则:先检测到"说过话"(振幅≥speechThreshold)后,静音持续≥silenceMs 即停;或到 maxMs 硬上限。
 * 阈值/时长由 VoiceInput 真机校准后传入。
 */
class SilenceDetector(
    private val speechThreshold: Int = 1000,
    private val silenceMs: Long = 1800,
    private val maxMs: Long = 30000,
) {
    private var heardSpeech = false
    private var lastLoudAt = 0L
    private var startAt = 0L

    fun start(now: Long) { heardSpeech = false; lastLoudAt = now; startAt = now }

    /** 喂一段音频平均振幅 + 当前时间(ms),返回 true=该停。 */
    fun feed(amplitude: Int, now: Long): Boolean {
        if (amplitude >= speechThreshold) { heardSpeech = true; lastLoudAt = now }
        if (now - startAt >= maxMs) return true
        return heardSpeech && (now - lastLoudAt >= silenceMs)
    }
}
