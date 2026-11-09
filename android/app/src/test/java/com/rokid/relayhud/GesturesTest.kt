package com.rokid.relayhud

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GesturesTest {
    @Test fun tapIsEnterUp() {
        assertEquals(GestureAction.TAP, Gestures.map(KeyEvent.KEYCODE_ENTER, KeyEvent.ACTION_UP))
        assertNull(Gestures.map(KeyEvent.KEYCODE_ENTER, KeyEvent.ACTION_DOWN))
    }
    @Test fun swipeBackIsScrollUp() {
        assertEquals(GestureAction.SCROLL_UP, Gestures.map(KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.ACTION_UP))
    }
    @Test fun swipeFwdIsScrollDown() {
        assertEquals(GestureAction.SCROLL_DOWN, Gestures.map(KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.ACTION_UP))
    }
    @Test fun backNotMappedLeftToSystem() {
        assertNull(Gestures.map(KeyEvent.KEYCODE_BACK, KeyEvent.ACTION_UP))
    }
    @Test fun trailingDpadUpDownIgnored() {
        assertNull(Gestures.map(KeyEvent.KEYCODE_DPAD_UP, KeyEvent.ACTION_UP))
        assertNull(Gestures.map(KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.ACTION_UP))
    }
}
