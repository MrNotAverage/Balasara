from PIL import Image
import sys

img = Image.open(sys.argv[1]).convert("RGBA")
data = img.getdata()
new_data = []

# Target color for the logo is #00AA5B (0, 170, 91)
TARGET_R, TARGET_G, TARGET_B = 0, 170, 91

for r, g, b, a in data:
    # Calculate luminance
    l = 0.299 * r + 0.587 * g + 0.114 * b
    
    # White is 255, we want it to be alpha 0.
    # Our green is ~110, we want it to be alpha 255.
    alpha = int(max(0, min(255, (255 - l) * (255.0 / (255.0 - 110.0)))))
    
    if alpha < 5:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append((TARGET_R, TARGET_G, TARGET_B, alpha))

img.putdata(new_data)

# Let's also crop it a bit to remove excess whitespace
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Add a tiny bit of padding
padding = 40
padded_img = Image.new("RGBA", (img.width + padding*2, img.height + padding*2), (0, 0, 0, 0))
padded_img.paste(img, (padding, padding))
padded_img.save(sys.argv[2], "PNG")
print("Done")
