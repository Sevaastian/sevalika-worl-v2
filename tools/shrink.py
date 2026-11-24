import sys
from PIL import Image
im=Image.open(sys.argv[1]);w,h=im.size;im.resize((w//2,h//2),Image.LANCZOS).save(sys.argv[2])
