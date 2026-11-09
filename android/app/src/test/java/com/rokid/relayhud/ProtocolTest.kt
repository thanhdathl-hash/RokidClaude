package com.rokid.relayhud

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtocolTest {
    @Test fun parsesSync() {
        val m = parseServerMessage("""{"type":"sync","sessionId":"s1","currentRun":{"id":"r1","status":"running","prompt":"hi"}}""")
        assertTrue(m is ServerMessage.Sync)
        m as ServerMessage.Sync
        assertEquals("s1", m.sessionId)
        assertEquals("r1", m.currentRun?.id)
        assertEquals("running", m.currentRun?.status)
    }

    @Test fun parsesSyncNoCurrentRun() {
        val m = parseServerMessage("""{"type":"sync","sessionId":null,"currentRun":null}""")
        m as ServerMessage.Sync
        assertEquals(null, m.currentRun)
    }

    @Test fun parsesToolUseEventWithSummary() {
        val m = parseServerMessage("""{"type":"event","runId":"r1","seq":2,"event":{"type":"tool_use","id":"t1","name":"Write","input":{"file_path":"a.txt"}}}""")
        m as ServerMessage.Event
        assertEquals(2, m.seq)
        val e = m.event as AgentEvent.ToolUse
        assertEquals("Write", e.name)
        assertEquals("a.txt", e.summary)
    }

    @Test fun parsesToolResultEvent() {
        val m = parseServerMessage("""{"type":"event","runId":"r1","seq":3,"event":{"type":"tool_result","id":"t1","output":"ok","isError":false}}""")
        val e = (m as ServerMessage.Event).event as AgentEvent.ToolResult
        assertEquals("t1", e.id)
        assertEquals(false, e.isError)
    }

    @Test fun parsesTextAndDoneAndError() {
        assertEquals("hi", ((parseServerMessage("""{"type":"event","runId":"r","seq":1,"event":{"type":"text","delta":"hi"}}""") as ServerMessage.Event).event as AgentEvent.Text).delta)
        assertTrue((parseServerMessage("""{"type":"event","runId":"r","seq":1,"event":{"type":"done","sessionId":"s"}}""") as ServerMessage.Event).event is AgentEvent.Done)
        assertEquals("boom", ((parseServerMessage("""{"type":"event","runId":"r","seq":1,"event":{"type":"error","message":"boom"}}""") as ServerMessage.Event).event as AgentEvent.Error).message)
    }

    @Test fun parsesRunEnd() {
        val m = parseServerMessage("""{"type":"runEnd","runId":"r1","status":"interrupted"}""")
        m as ServerMessage.RunEnd
        assertEquals("interrupted", m.status)
    }

    @Test fun unknownAndGarbageAreSafe() {
        assertTrue(parseServerMessage("""{"type":"whatever"}""") is ServerMessage.Unknown)
        assertTrue(parseServerMessage("not json") is ServerMessage.Unknown)
    }

    @Test fun parsesTranscript() {
        val m = parseServerMessage("""{"type":"transcript","text":"建个文件"}""")
        m as ServerMessage.Transcript
        assertEquals("建个文件", m.text)
    }

    @Test fun parsesPermissionRequest() {
        val m = parseServerMessage("""{"type":"permissionRequest","id":"p1","tool":"Bash","summary":"运行: ls","options":["允许一次","允许且不再问","拒绝"],"allowKey":"Bash::ls"}""")
        m as ServerMessage.PermissionRequest
        assertEquals("p1", m.id)
        assertEquals("运行: ls", m.summary)
        assertEquals(listOf("允许一次", "允许且不再问", "拒绝"), m.options)
        assertEquals("Bash::ls", m.allowKey)
    }

    @Test
    fun parsesUsage() {
        val msg = parseServerMessage("""{"type":"usage","model":"claude-opus-4-8","costUsd":0.023,"tokens":1500}""")
        assertTrue(msg is ServerMessage.Usage)
        msg as ServerMessage.Usage
        assertEquals("claude-opus-4-8", msg.model)
        assertEquals(0.023, msg.costUsd, 1e-6)
        assertEquals(1500L, msg.tokens)
    }

    @Test
    fun parsesUsageNullModel() {
        val msg = parseServerMessage("""{"type":"usage","model":null,"costUsd":0,"tokens":0}""")
        assertTrue(msg is ServerMessage.Usage)
        assertEquals(null, (msg as ServerMessage.Usage).model)
    }

    @Test
    fun parsesPermissionTimeoutChoice() {
        val msg = parseServerMessage("""{"type":"permissionRequest","id":"p1","summary":"Run: ls","options":["Allow once","Allow this kind","Deny"],"allowKey":"Bash","timeoutChoice":"Deny"}""")
        assertTrue(msg is ServerMessage.PermissionRequest)
        assertEquals("Deny", (msg as ServerMessage.PermissionRequest).timeoutChoice)
    }

    @Test
    fun parsesModelTimeoutChoice() {
        val msg = parseServerMessage("""{"type":"modelRequest","id":"m1","options":["opus","sonnet","haiku","Cancel"],"current":0,"timeoutChoice":"Cancel"}""")
        assertTrue(msg is ServerMessage.ModelRequest)
        assertEquals("Cancel", (msg as ServerMessage.ModelRequest).timeoutChoice)
    }

    @Test
    fun parsesModelRequest() {
        val msg = parseServerMessage("""{"type":"modelRequest","id":"m1","options":["opus","sonnet","haiku","取消"],"current":1}""")
        assertTrue(msg is ServerMessage.ModelRequest)
        msg as ServerMessage.ModelRequest
        assertEquals("m1", msg.id)
        assertEquals(listOf("opus","sonnet","haiku","取消"), msg.options)
        assertEquals(1, msg.current)
    }
}
