import sys

def process():
    # Read BMP
    with open('img/temp.bmp', 'rb') as f:
        header = f.read(54)
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
        
        pixels = [] 
        for y in range(height):
            row_data = f.read(row_size)
            row = []
            for x in range(width):
                if bpp == 24:
                    b, g, r = row_data[x*3:x*3+3]
                elif bpp == 32:
                    b, g, r = row_data[x*4:x*4+3]
                else:
                    b, g, r = 255, 255, 255
                    
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                alpha = int(max(0, min(255, (255 - lum) * 2.0)))
                
                if alpha < 15:
                    row.append((255, 255, 255, 0))
                else:
                    row.append((91, 170, 0, alpha)) # BGRA format for TGA
            pixels.append(row)
            
    if not top_down:
        pixels.reverse()
        
    def save_tga(filename, crop_pixels):
        h = len(crop_pixels)
        w = len(crop_pixels[0])
        
        header = bytearray(18)
        header[2] = 2 
        header[12] = w & 0xFF
        header[13] = (w >> 8) & 0xFF
        header[14] = h & 0xFF
        header[15] = (h >> 8) & 0xFF
        header[16] = 32
        header[17] = 0x28 
        
        with open(filename, 'wb') as out:
            out.write(header)
            for r in crop_pixels:
                for p in r:
                    out.write(bytes(p))

    # Icon: X: 371 to 651, Y: 226 to 625 (10px margin)
    icon_pixels = []
    for y in range(226, 626):
        icon_pixels.append(pixels[y][371:652])
    save_tga('img/icon_transparent.tga', icon_pixels)
    
    # Text: X: 214 to 808, Y: 656 to 791 (10px margin)
    text_pixels = []
    for y in range(656, 792):
        text_pixels.append(pixels[y][214:809])
    save_tga('img/text_transparent.tga', text_pixels)

    # Combined full logo for sidebar if needed: X: 214 to 808, Y: 226 to 791
    full_pixels = []
    for y in range(226, 792):
        full_pixels.append(pixels[y][214:809])
    save_tga('img/full_transparent.tga', full_pixels)

process()
print("Done extracting TGA files.")
