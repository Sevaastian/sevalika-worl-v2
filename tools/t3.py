import sys, pickle, os; sys.path.insert(0,'.')
import numpy as np
from r3d import *
import char3d as C
from PIL import Image
kind=sys.argv[1]; names=sys.argv[2:]
fn={'hat':C.hat,'gl':C.glasses,'bk':C.back}[kind]
tint=lambda im,c:Image.fromarray((np.array(im)*np.array([*c,255])/255).astype(np.uint8),"RGBA")
BG='/tmp/bgcache.pkl'
if os.path.exists(BG): bgs,bds=pickle.load(open(BG,'rb'))
else:
  bgs=[];bds=[]
  for d,yaw in enumerate(DIRS_YAW):
    cam=Cam(yaw)
    base=render(C.body(0),cam); bd=base[2]
    add=lambda L:to_image(downsample(outline(L[0],L[1],L[2]),L[1]))
    out=Image.new("RGBA",(FW,FH),(60,70,90,255))
    out.alpha_composite(add(composite_visible(render(C.legs(0),cam),bd)))
    out.alpha_composite(add(composite_visible(render(C.shoes(0),cam),bd)))
    out.alpha_composite(tint(add(base),(241,194,155)))
    out.alpha_composite(tint(add(composite_visible(render(C.shirt(0),cam),bd)),(59,130,246)))
    out.alpha_composite(add(composite_visible(render(C.face(0),cam),bd)))
    out.alpha_composite(tint(add(composite_visible(render(C.hair('hs_short'),cam),bd)),(120,70,30)))
    bgs.append(out);bds.append(bd)
  pickle.dump((bgs,bds),open(BG,'wb'))
rows=[]
for nm in names:
  tiles=[]
  for d,yaw in enumerate(DIRS_YAW):
    cam=Cam(yaw); bd=bds[d]
    out=bgs[d].copy()
    L=composite_visible(render(fn(nm),cam),bd)
    out.alpha_composite(to_image(downsample(outline(L[0],L[1],L[2]),L[1])))
    tiles.append(out)
  rows.append(tiles)
sheet=Image.new("RGBA",(FW*4,FH*len(rows)))
for r,t in enumerate(rows):
  for i,t_ in enumerate(t): sheet.paste(t_,(i*FW,r*FH))
sheet.save('/tmp/c3d_%s.png'%kind)
