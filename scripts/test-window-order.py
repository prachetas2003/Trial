"""Inspect real Windows overlay styles/z-order; test-only, never shipped."""
import ctypes
from ctypes import wintypes
import json
import sys

user = ctypes.windll.user32
user.GetForegroundWindow.restype = wintypes.HWND
user.IsWindowVisible.argtypes = [wintypes.HWND]
user.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
user.GetWindowLongW.restype = wintypes.LONG
user.GetAncestor.argtypes = [wintypes.HWND, wintypes.UINT]
user.GetAncestor.restype = wintypes.HWND
user.WindowFromPoint.argtypes = [wintypes.POINT]
user.WindowFromPoint.restype = wintypes.HWND
callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
order = []
@callback_type
def record(hwnd, _):
    order.append(hwnd)
    return True
user.EnumWindows(record, 0)
foreground = user.GetForegroundWindow()
title = ctypes.create_unicode_buffer(512)
user.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user.GetWindowTextW(foreground, title, len(title))
handles = [int(h) for h in sys.argv[1:4]]
point = wintypes.POINT(int(sys.argv[4]), int(sys.argv[5]))
hit = user.GetAncestor(user.WindowFromPoint(point), 2)
print(json.dumps({
    'foreground': str(foreground), 'foregroundTitle': title.value, 'hit': str(hit),
    'windows': [{
        'handle': str(h), 'topmost': bool(user.GetWindowLongW(h, -20) & 0x8),
        'visible': bool(user.IsWindowVisible(h)),
        'aboveForeground': h in order and foreground in order and order.index(h) < order.index(foreground)
    } for h in handles]
}))
