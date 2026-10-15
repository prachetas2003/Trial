"""Move/click the pointer on an isolated native-app test desktop; not shipped."""
import ctypes
import ctypes.util
import os
import sys
import time

x, y = int(sys.argv[1]), int(sys.argv[2])
operation = sys.argv[3] if len(sys.argv) > 3 else 'move'
if sys.platform == 'win32':
    user = ctypes.windll.user32
    user.SetCursorPos(x, y)
    if operation == 'toss':
        dx, dy = int(sys.argv[4]), int(sys.argv[5])
        for i in range(1, 13):
            user.SetCursorPos(round(x+dx*i/12), round(y+dy*i/12))
            time.sleep(1/60)
        user.mouse_event(0x0004, 0, 0, 0, 0)
    if operation in ('click', 'down'): user.mouse_event(0x0002, 0, 0, 0, 0)
    if operation in ('click', 'up'): user.mouse_event(0x0004, 0, 0, 0, 0)
elif sys.platform.startswith('linux'):
    xlib = ctypes.CDLL(ctypes.util.find_library('X11'))
    xtst = ctypes.CDLL(ctypes.util.find_library('Xtst'))
    xlib.XOpenDisplay.argtypes = [ctypes.c_char_p]
    xlib.XOpenDisplay.restype = ctypes.c_void_p
    xlib.XCloseDisplay.argtypes = [ctypes.c_void_p]
    xlib.XFlush.argtypes = [ctypes.c_void_p]
    xlib.XSync.argtypes = [ctypes.c_void_p, ctypes.c_int]
    xtst.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]
    xtst.XTestFakeButtonEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
    display = xlib.XOpenDisplay(os.environ.get('DISPLAY', ':99').encode())
    if not display:
        raise SystemExit('No isolated test display is available.')
    try:
        xtst.XTestFakeMotionEvent(display, -1, x, y, 0)
        if operation == 'toss':
            dx, dy = int(sys.argv[4]), int(sys.argv[5])
            for i in range(1, 13):
                xtst.XTestFakeMotionEvent(display, -1, round(x+dx*i/12), round(y+dy*i/12), 0)
                xlib.XSync(display, 0)
                time.sleep(1/60)
            xtst.XTestFakeButtonEvent(display, 1, 0, 0)
        if operation in ('click', 'down'): xtst.XTestFakeButtonEvent(display, 1, 1, 0)
        if operation in ('click', 'up'): xtst.XTestFakeButtonEvent(display, 1, 0, 0)
        # Flush alone can lose queued XTest requests when a short-lived client
        # disconnects. Wait until the X server has processed the stroke.
        xlib.XSync(display, 0)
    finally:
        xlib.XCloseDisplay(display)
else:
    raise SystemExit('Native pointer smoke tests support Windows and Linux.')
