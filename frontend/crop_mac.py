import sys
try:
    from AppKit import NSImage
    from Foundation import NSData
except ImportError:
    print("No PyObjC")
    sys.exit(1)

print("PyObjC found!")
