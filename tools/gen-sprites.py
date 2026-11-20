import math, json, sys
from PIL import Image, ImageDraw
TW, TH = 96, 48           # sanat ızgarasında karo boyutu
SC = 2                    # nearest büyütme
OUT = "#2a1c2e"
AX, AY = 130, 170         # karo merkezi (anchor)

def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def shade(c, a):
    r,g,b = hexrgb(c) if isinstance(c,str) else c
    f=lambda v: int(max(0,min(255, v + a*(255-v) if a>0 else v*(1+a))))
    return (f(r),f(g),f(b))

class Canvas:
    def __init__(s):
        s.im = Image.new("RGBA",(260,240),(0,0,0,0)); s.d = ImageDraw.Draw(s.im)
    def p(s,x,y,z=0):
        return (AX+(x-y)*TW/2, AY+(x+y-1)*TH/2 - z)
    def poly(s,pts,fill,outline=True):
        s.d.polygon(pts, fill=fill, outline=OUT if outline else None)
    def box(s,x0,y0,x1,y1,z0,z1,c,top=None,lc=None,rc=None):
        top = top or shade(c,0.22); lc = lc or c; rc = rc or shade(c,-0.22)
        P=s.p
        # sol-ön yüz (y=y1), sağ-ön yüz (x=x1), üst
        s.poly([P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)], lc)
        s.poly([P(x1,y1,z0),P(x1,y0,z0),P(x1,y0,z1),P(x1,y1,z1)], rc)
        s.poly([P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)], top)
    def ell(s,cx,cy,rx,ry,z,fill,outline=True):
        c = s.p(cx,cy,z); w=rx*TW/2*1.414; h=ry*TH/2*1.414
        s.d.ellipse([c[0]-w,c[1]-h,c[0]+w,c[1]+h], fill=fill, outline=OUT if outline else None)
    def cyl(s,cx,cy,r,z0,z1,c,top=None):
        top = top or shade(c,0.25); P=s.p
        w=r*TW/2*1.414; h=r*TH/2*1.414
        a=P(cx,cy,z0); b=P(cx,cy,z1)
        s.d.ellipse([a[0]-w,a[1]-h,a[0]+w,a[1]+h], fill=shade(c,-0.25), outline=OUT)
        s.d.rectangle([a[0]-w,b[1],a[0]+w,a[1]], fill=c)
        s.d.line([(a[0]-w,b[1]),(a[0]-w,a[1])],fill=OUT); s.d.line([(a[0]+w,b[1]),(a[0]+w,a[1])],fill=OUT)
        # sağ gölge şeridi
        s.d.rectangle([a[0]+w*0.25,b[1],a[0]+w-1,a[1]], fill=shade(c,-0.2))
        s.d.ellipse([b[0]-w,b[1]-h,b[0]+w,b[1]+h], fill=top, outline=OUT)
    def sphere(s,cx,cy,z,r,c):
        p=s.p(cx,cy,z); s.d.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r], fill=c, outline=OUT)
        s.d.ellipse([p[0]-r*0.5,p[1]-r*0.6,p[0]-r*0.05,p[1]-r*0.15], fill=shade(c,0.45))
    def save(s,name):
        bb = s.im.getbbox()
        im = s.im.crop(bb)
        # anchor: bbox içinde
        ax, ay = AX-bb[0], AY-bb[1]
        big = im.resize((im.width*SC, im.height*SC), Image.NEAREST)
        big.save(f"public/sprites/{name}.png")
        k = 64/TW*1.2
        w = im.width*k; h = im.height*k
        # drawImage merkez: bbox merkezi; anchor'a göre ofset
        ox = (im.width/2 - ax)*k
        # görsel alt kenarı = footY + oy ; footY = karo merkezi -> oy = alt kenarın anchor altındaki mesafesi
        oy = (im.height - ay)*k
        return dict(drawW=round(w), drawH=round(h), offsetX=round(ox), offsetY=round(oy))

metas={}
def make(name, fn):
    c=Canvas(); fn(c); metas[name]=c.save(name)

# --- Paletler
RED="#c0263f"; WOOD="#a8672f"; DWOOD="#6b3f1d"; NAVY="#2e3a52"; GOLD="#f2c230"; GREEN="#1f8a4c"; FELT="#17784a"

def sofa(c):
    c.box(0.08,0.12,0.92,0.88,0,8,shade(RED,-0.25),top=shade(RED,-0.05))          # taban
    c.box(0.08,0.12,0.92,0.34,8,28,RED)                                             # sırt
    c.box(0.08,0.34,0.26,0.88,8,19,shade(RED,-0.05))                                # sol kol (x0)
    c.box(0.74,0.34,0.92,0.88,8,19,shade(RED,-0.05))                                # sağ kol
    c.box(0.26,0.34,0.74,0.88,8,14,shade(RED,0.18))                                 # minder
    for z in (6,): c.d.line([c.p(0.5,0.88,z),c.p(0.5,0.88,z)],fill=OUT)
    c.sphere(0.5,0.28,18,3,GOLD) if False else None
def chair(c):  # bar sandalyesi
    c.cyl(0.5,0.5,0.34,0,2,"#3b3f4a")
    c.cyl(0.5,0.5,0.07,2,26,"#9aa3b2")
    c.cyl(0.5,0.5,0.3,26,32,"#d23b55")
def table(c):
    c.cyl(0.5,0.5,0.26,0,3,"#3b3f4a")
    c.cyl(0.5,0.5,0.07,3,22,"#9aa3b2")
    c.cyl(0.5,0.5,0.42,22,27,"#7dd3fc",top="#b9e8ff")
def counter(c):
    c.box(0.04,0.08,0.96,0.92,0,26,NAVY,top="#ffffff",lc=NAVY,rc=shade(NAVY,-0.25))
    c.box(0.0,0.04,1.0,0.96,26,30,"#e8edf5",top="#ffffff")
    # turuncu şerit
    P=c.p
    c.poly([P(0.04,0.92,16),P(0.96,0.92,16),P(0.96,0.92,20),P(0.04,0.92,20)],"#f59e0b")
def casinotable(c):
    c.cyl(0.5,0.5,0.28,0,3,"#3a2412")
    c.cyl(0.5,0.5,0.1,3,18,"#5a3a1c")
    c.cyl(0.5,0.5,0.47,18,25,"#7a4a22",top="#7a4a22")
    c.ell(0.5,0.5,0.38,0.38,25,FELT)
    c.ell(0.5,0.5,0.38,0.38,25,None,outline=True) if False else None
    for dx,dy,col in ((-0.12,0.05,"#ef4444"),(0.0,0.12,"#fafafa"),(0.12,0.0,"#3b82f6")):
        c.cyl(0.5+dx,0.5+dy,0.05,25,28,col)
    c.box(0.42,0.34,0.5,0.46,25,26,"#ffffff"); c.box(0.52,0.4,0.6,0.52,25,26,"#ffffff")
def bin_(c):
    c.cyl(0.5,0.5,0.26,0,24,"#3d7a52")
    c.cyl(0.5,0.5,0.29,24,28,"#2f5f40")
    for i in (-0.1,0.0,0.1):
        a=c.p(0.5+i,0.5+0.2,4); b=c.p(0.5+i,0.5+0.2,20); c.d.line([a,b],fill=shade("#3d7a52",-0.35))
def bookshelf(c):
    c.box(0.06,0.18,0.94,0.82,0,56,"#7b4a24",top="#9b6434",lc="#8a5429",rc="#5c3517")
    P=c.p
    cols=["#e11d48","#2563eb","#16a34a","#f59e0b","#7c3aed","#0ea5e9","#f97316"]
    for row,(z0,z1) in enumerate(((4,16),(20,32),(36,48))):
        x=0.12
        i=0
        while x<0.86:
            w=0.07+0.02*((i*3+row)%3)
            col=cols[(i+row*2)%len(cols)]
            h=z1-((i+row)%3)*2
            c.poly([P(x,0.82,z0),P(x+w,0.82,z0),P(x+w,0.82,h),P(x,0.82,h)],col)
            x+=w+0.005; i+=1
        c.poly([P(0.06,0.82,z1+0),P(0.94,0.82,z1+0),P(0.94,0.82,z1+2),P(0.06,0.82,z1+2)],"#6b3f1d")
def tv(c):
    c.box(0.38,0.38,0.62,0.62,0,3,"#20232d")
    c.cyl(0.5,0.5,0.07,3,10,"#2b2f3b")
    c.box(0.05,0.44,0.95,0.56,10,44,"#15171f",top="#2a2d3a")
    P=c.p
    bars=["#ef4444","#f59e0b","#fde047","#22c55e","#38bdf8","#8b5cf6"]
    n=len(bars); x0,x1=0.09,0.91
    for i,col in enumerate(bars):
        a=x0+(x1-x0)*i/n; b=x0+(x1-x0)*(i+1)/n
        c.d.polygon([P(a,0.56,13),P(b,0.56,13),P(b,0.56,41),P(a,0.56,41)],fill=col)
def plant(c):
    c.cyl(0.5,0.5,0.22,0,16,"#b4532a")
    c.cyl(0.5,0.5,0.25,16,20,"#c96a38")
    c.ell(0.5,0.5,0.2,0.2,20,"#4a2b17",outline=False)
    P=c.p
    leaf=["#1f8a3d","#34b857","#17803a","#46c968"]
    bx,by=P(0.5,0.5,20)
    specs=[(-62,36,9),(62,36,9),(-30,50,10),(30,50,10),(0,58,10),(-85,22,8),(85,22,8)]
    for i,(ang,ln,wd) in enumerate(specs):
        r=math.radians(ang)
        tx=bx+math.sin(r)*ln*0.9; ty=by-math.cos(r)*ln*0.85
        nx,ny=math.cos(r),math.sin(r)
        mx,my=(bx+tx)/2,(by+ty)/2
        pts=[(bx,by),(mx-nx*wd,my-ny*wd*0.6),(tx,ty),(mx+nx*wd,my+ny*wd*0.6)]
        c.d.polygon(pts,fill=leaf[i%4],outline=OUT)
        c.d.line([(bx,by),(tx,ty)],fill=shade(leaf[i%4],-0.3))
def lamp(c):
    c.cyl(0.5,0.5,0.2,0,3,"#3b3f4a")
    c.cyl(0.5,0.5,0.05,3,52,"#8a93a3")
    c.sphere(0.5,0.5,58,10,"#ffe14d")
    c.sphere(0.5,0.5,58,6,"#fff7b0")
def logseat(c):
    P=c.p
    c.box(0.08,0.3,0.92,0.7,0,13,"#7a4a22",top="#9a6130")
    # halka uçlar
    c.d.ellipse([*(P(0.92,0.5,6)[0]-6,P(0.92,0.5,6)[1]-7),*(P(0.92,0.5,6)[0]+6,P(0.92,0.5,6)[1]+7)],fill="#d9a75f",outline=OUT)
def beanbag(c):
    c.ell(0.5,0.52,0.42,0.42,0,shade("#38bdf8",-0.3))
    c.ell(0.5,0.5,0.4,0.4,10,"#38bdf8")
    c.ell(0.46,0.46,0.26,0.26,20,"#7dd3fc")
    c.ell(0.42,0.42,0.12,0.12,25,"#bae6fd",outline=False)
def surfboard(c):
    P=c.p
    base=P(0.5,0.5,0)
    pts=[(base[0]-3,base[1]),(base[0]+9,base[1]-2),(base[0]+14,base[1]-54),(base[0]+4,base[1]-66),(base[0]-8,base[1]-52)]
    c.d.polygon(pts,fill="#22d3ee",outline=OUT)
    c.d.polygon([(base[0]+1,base[1]-6),(base[0]+9,base[1]-6),(base[0]+11,base[1]-50),(base[0]+3,base[1]-58)],fill="#fde047")
    c.d.line([(base[0]+3,base[1]-6),(base[0]+4,base[1]-58)],fill="#ef4444",width=2)
    c.cyl(0.5,0.5,0.2,0,3,"#d6b88d")
def fountain(c):
    c.cyl(0.5,0.5,0.46,0,12,"#9aa3b2",top="#cbd5e1")
    c.ell(0.5,0.5,0.4,0.4,12,"#38bdf8")
    c.ell(0.5,0.5,0.3,0.3,12,"#7dd3fc",outline=False)
    c.cyl(0.5,0.5,0.1,12,30,"#9aa3b2")
    c.cyl(0.5,0.5,0.26,30,34,"#cbd5e1")
    c.ell(0.5,0.5,0.2,0.2,34,"#38bdf8")
    P=c.p
    for dx in (-0.12,0.0,0.12):
        a=P(0.5+dx,0.5,34); c.d.line([a,(a[0]+dx*60,a[1]-14)],fill="#e0f2fe",width=2)
    c.d.line([P(0.5,0.5,34),P(0.5,0.5,52)],fill="#e0f2fe",width=3)

for n,f in dict(sofa=sofa,chair=chair,table=table,counter=counter,casinotable=casinotable,bin=bin_,bookshelf=bookshelf,tv=tv,plant=plant,lamp=lamp,logseat=logseat,beanbag=beanbag,surfboard=surfboard,fountain=fountain).items():
    make(n,f)
json.dump(metas,open('/tmp/spr/metas.json','w'),indent=1)
print(json.dumps(metas))
