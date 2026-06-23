import sys

def get_bbox(filename):
    with open(filename, 'rb') as f:
        header = f.read(54)
        if header[:2] != b'BM':
            print("Not a BMP")
            return
        
        width = int.from_bytes(header[18:22], byteorder='little', signed=True)
        height = int.from_bytes(header[22:26], byteorder='little', signed=True)
        bpp = int.from_bytes(header[28:30], byteorder='little')
        offset = int.from_bytes(header[10:14], byteorder='little')
        
        top_down = False
        if height < 0:
            top_down = True
            height = -height
            
        f.seek(offset)
        row_size = ((width * bpp + 31) // 32) * 4
        
        non_white = []
        for y in range(height):
            row = f.read(row_size)
            if not row: break
            actual_y = y if top_down else height - 1 - y
            for x in range(width):
                if bpp == 24:
                    b, g, r = row[x*3 : x*3+3]
                    if r < 240 or g < 240 or b < 240:
                        non_white.append((x, actual_y))
                elif bpp == 32:
                    b, g, r, a = row[x*4 : x*4+4]
                    if r < 240 or g < 240 or b < 240:
                        non_white.append((x, actual_y))

        if not non_white:
            print("Blank image")
            return
            
        xs = [p[0] for p in non_white]
        ys = [p[1] for p in non_white]
        
        # separate into top cluster (icon) and bottom cluster (text)
        ys_sorted = sorted(list(set(ys)))
        max_gap = 0
        gap_start = 0
        gap_end = 0
        for i in range(len(ys_sorted)-1):
            gap = ys_sorted[i+1] - ys_sorted[i]
            if gap > max_gap:
                max_gap = gap
                gap_start = ys_sorted[i]
                gap_end = ys_sorted[i+1]
                
        icon_xs = [p[0] for p in non_white if p[1] <= gap_start]
        icon_ys = [p[1] for p in non_white if p[1] <= gap_start]
        text_xs = [p[0] for p in non_white if p[1] >= gap_end]
        text_ys = [p[1] for p in non_white if p[1] >= gap_end]
        
        if icon_xs:
            print(f"Icon BBox: X: {min(icon_xs)} to {max(icon_xs)}, Y: {min(icon_ys)} to {max(icon_ys)}")
        if text_xs:
            print(f"Text BBox: X: {min(text_xs)} to {max(text_xs)}, Y: {min(text_ys)} to {max(text_ys)}")

get_bbox('img/temp.bmp')
