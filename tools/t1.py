import sys, time
sys.path.insert(0,'.')
import numpy as np
from r3d import *
import char3d as C
from PIL import Image
t=time.time()
tiles=[]
for d,yaw in enumerate(DIRS_YAW):
    cam=Cam(yaw)
    layers=[]
    base=render(C.body(0),cam); bd=base[2]
    comp=np.zeros((FH*SS,FW*SS,4))
    def add(L):
        rgb,al,dp=L
        rgb=outline(rgb,al,dp)
        return to_image(downsample(rgb,al))
    imgs=[add(base)]
    for parts in (C.legs(0),C.shoes(0),C.shirt(0)):
        L=composite_visible(render(parts,cam),bd); imgs.append(add(L))
    out=Image.new("RGBA",(FW,FH),(60,70,90,255))
    for im in imgs: out.alpha_composite(im)
    tiles.append(out)
sheet=Image.new("RGBA",(FW*4,FH),(60,70,90,255))
for i,t_ in enumerate(tiles): sheet.paste(t_,(i*FW,0))
sheet.save('/tmp/c3d_test.png');print(time.time()-t)
