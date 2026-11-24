import sys; sys.path.insert(0,'.')
import numpy as np
from r3d import *
import char3d as C
from PIL import Image
def tint(im,col):
    a=np.array(im).astype(float)/255; c=np.array(col)/255
    a[...,:3]*=c; return Image.fromarray((a*255).astype(np.uint8),"RGBA")
styles=sys.argv[1:] or ["hs_short"]
rows=[]
for st in styles:
  tiles=[]
  for d,yaw in enumerate(DIRS_YAW):
    cam=Cam(yaw)
    base=render(C.body(0),cam); bd=base[2]
    def add(L,col=None):
        rgb,al,dp=L
        im=to_image(downsample(outline(rgb,al,dp),al))
        return tint(im,col) if col else im
    out=Image.new("RGBA",(FW,FH),(60,70,90,255))
    out.alpha_composite(add(composite_visible(render(C.legs(0),cam),bd)))
    out.alpha_composite(add(composite_visible(render(C.shoes(0),cam),bd)))
    out.alpha_composite(add(base,(241,194,155)))
    out.alpha_composite(add(composite_visible(render(C.shirt(0),cam),bd),(59,130,246)))
    out.alpha_composite(add(composite_visible(render(C.face(0),cam),bd)))
    out.alpha_composite(add(composite_visible(render(C.hair(st),cam),bd),(120,70,30)))
    tiles.append(out)
  rows.append(tiles)
sheet=Image.new("RGBA",(FW*4,FH*len(rows)))
for r,t in enumerate(rows):
  for i,t_ in enumerate(t): sheet.paste(t_,(i*FW,r*FH))
sheet.save('/tmp/c3d_test.png')
