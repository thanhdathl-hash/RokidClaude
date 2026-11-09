package com.rokid.relayhud

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.util.Base64
import java.io.ByteArrayOutputStream

/**
 * 采音(16kHz 单声道 PCM)→ WAV → base64,经 onAudio 回调交出。
 * 转写在中继侧(whisper)。Phase 2 眼镜同款架构(采音在端)。
 */
class VoiceInput(
    private val context: Context,
    private val onAudio: (String) -> Unit,
    private val onError: (String) -> Unit,
) {
    private val sampleRate = 16000
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var recording = false
    private var thread: Thread? = null

    fun available(): Boolean = true // 采音不依赖系统识别服务

    @SuppressLint("MissingPermission") // 调用方已确保 RECORD_AUDIO 授权
    fun start() {
        if (recording) return
        val minBuf = AudioRecord.getMinBufferSize(
            sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        val record = AudioRecord(
            MediaRecorder.AudioSource.MIC, sampleRate,
            AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, minBuf
        )
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release(); main.post { onError("录音初始化失败") }; return
        }
        recording = true
        record.startRecording()
        val detector = SilenceDetector(speechThreshold = 200, silenceMs = 2000)   // 真机校准:底噪~50,说话中位~556
        thread = Thread {
            detector.start(android.os.SystemClock.elapsedRealtime())
            val pcm = ByteArrayOutputStream()
            val buf = ByteArray(minBuf)
            while (recording) {
                val n = record.read(buf, 0, buf.size)
                if (n > 0) {
                    pcm.write(buf, 0, n)
                    val amp = avgAmplitude(buf, n)
                    if (detector.feed(amp, android.os.SystemClock.elapsedRealtime())) {
                        recording = false   // 自动停:静音够久或超时
                    }
                }
            }
            try { record.stop() } catch (_: Exception) {}
            record.release()
            val wav = pcmToWav(pcm.toByteArray(), sampleRate)
            val b64 = Base64.encodeToString(wav, Base64.NO_WRAP)
            main.post { onAudio(b64) }
        }.also { it.start() }
    }

    fun stop() { recording = false } // 录音线程收尾 + 回调 onAudio

    fun destroy() { recording = false }

    /** 16-bit PCM 小端,取该段样本绝对值平均作为音量。 */
    private fun avgAmplitude(buf: ByteArray, len: Int): Int {
        var sum = 0L; var count = 0
        var i = 0
        while (i + 1 < len) {
            val s = (buf[i].toInt() and 0xff) or (buf[i + 1].toInt() shl 8)
            sum += kotlin.math.abs(s.toShort().toInt()); count++
            i += 2
        }
        return if (count == 0) 0 else (sum / count).toInt()
    }

    private fun pcmToWav(pcm: ByteArray, rate: Int, channels: Int = 1, bits: Int = 16): ByteArray {
        val byteRate = rate * channels * bits / 8
        val out = ByteArrayOutputStream()
        fun str(s: String) = out.write(s.toByteArray(Charsets.US_ASCII))
        fun i32(v: Int) { out.write(v and 0xff); out.write((v shr 8) and 0xff); out.write((v shr 16) and 0xff); out.write((v shr 24) and 0xff) }
        fun i16(v: Int) { out.write(v and 0xff); out.write((v shr 8) and 0xff) }
        str("RIFF"); i32(36 + pcm.size); str("WAVE")
        str("fmt "); i32(16); i16(1); i16(channels); i32(rate); i32(byteRate); i16(channels * bits / 8); i16(bits)
        str("data"); i32(pcm.size); out.write(pcm)
        return out.toByteArray()
    }
}
