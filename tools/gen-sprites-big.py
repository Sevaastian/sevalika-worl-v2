import json, math
src = open('tools/gen-sprites.py').read().split("metas={}")[0]
ns = {}
exec(src, ns)
Canvas = ns['Canvas']; shade = ns['shade']; Image = ns['Image']; ImageDraw = ns['ImageDraw']
ns['AX'], ns['AY'] = 330, 360
def init(s):
    s.im = Image.new("RGBA",(700,560),(0,0,0,0)); s.d = ImageDraw.Draw(s.im)
Canvas.__init__ = init
OUT = ns['OUT']

class Big(Canvas):
    def __init__(s, w, h):
        super().__init__(); s.w=w; s.h=h
    # u,v: ayak izi köşesinden (0..w, 0..h); merkez (0.5,0.5)'e kaydırılır
    def X(s,u): return 0.5 - s.w/2 + u
    def Y(s,v): return 0.5 - s.h/2 + v
    def B(s,u0,v0,u1,v1,z0,z1,c,**k): s.box(s.X(u0),s.Y(v0),s.X(u1),s.Y(v1),z0,z1,c,**k)
    def Pt(s,u,v,z): return s.p(s.X(u),s.Y(v),z)
    def Poly(s,pts,fill): s.poly([s.Pt(*q) for q in pts],fill)
    def Cyl(s,u,v,r,z0,z1,c,**k): s.cyl(s.X(u),s.Y(v),r,z0,z1,c,**k)
    def Sph(s,u,v,z,r,c): s.sphere(s.X(u),s.Y(v),z,r,c)
    def save2(s,name,wt,ht):
        bb = s.im.getbbox(); im = s.im.crop(bb)
        ax, ay = ns['AX']-bb[0], ns['AY']-bb[1]
        big = im.resize((im.width*2, im.height*2), Image.NEAREST)
        big.save(f"public/sprites/{name}.png")
        k = 64/96
        E = (wt+ht)/4 - 0.5
        return dict(drawW=round(im.width*k), drawH=round(im.height*k),
                    offsetX=round((im.width/2-ax)*k), offsetY=round((im.height-ay)*k - 32*E))

metas={}
# ---------------- Casino bar 4x2 ----------------
def casino_bar():
    c=Big(4,2)
    WD="#4a2518"; GOLD="#f2c230"
    # arka raf (duvar tarafı)
    c.B(0.1,0.05,3.9,0.5,0,76,"#3a1a2e",top="#5a2a48",lc="#4a2038",rc="#2a1222")
    # şişe raflari (ön yüz v=0.5)
    cols=["#ef4444","#22c55e","#38bdf8","#f59e0b","#a855f7","#fde047"]
    for row,(z0,z1) in enumerate(((10,26),(32,48),(54,70))):
        c.Poly([(0.2,0.5,z1+1),(3.8,0.5,z1+1),(3.8,0.5,z1+3),(0.2,0.5,z1+3)],GOLD)
        i=0;u=0.3
        while u<3.7:
            col=cols[(i+row)%6]; hh=z1-((i%3)*3)
            c.Poly([(u,0.5,z0),(u+0.12,0.5,z0),(u+0.12,0.5,hh),(u,0.5,hh)],col)
            u+=0.2;i+=1
    # neon tabela
    c.Poly([(1.2,0.5,86),(2.8,0.5,86),(2.8,0.5,104),(1.2,0.5,104)],"#1a0a18")
    c.Poly([(1.28,0.5,89),(2.72,0.5,89),(2.72,0.5,101),(1.28,0.5,101)],"#ff4fa3")
    c.Poly([(1.4,0.5,92),(2.6,0.5,92),(2.6,0.5,98),(1.4,0.5,98)],"#ffd1e8")
    # servis tezgahı
    c.B(0.2,0.85,3.8,1.45,0,32,WD,top="#7a4a2a",lc="#5a3020",rc="#3a1c10")
    c.B(0.1,0.78,3.9,1.52,32,37,GOLD,top="#ffe27a",lc="#d9a520",rc="#a67c10")
    # altın korkuluk ve ön panel
    for i in range(7):
        u=0.45+i*0.5
        c.Poly([(u,1.45,6),(u+0.3,1.45,6),(u+0.3,1.45,26),(u,1.45,26)],"#5a2a1a")
    # tabureler
    for i in range(4):
        u=0.55+i*0.95
        c.Cyl(u,1.85,0.2,0,2,"#2b2f3b"); c.Cyl(u,1.85,0.05,2,22,"#b8c0cc"); c.Cyl(u,1.85,0.22,22,28,"#c0263f")
    return c
casino=casino_bar(); metas['casino_bar']=casino.save2('casino_bar',4,2)

# ---------------- Mutfak bloğu 4x2 ----------------
def kitchen():
    c=Big(4,2)
    ST="#cfd6df"
    # arka sıra: ocak + dolap
    c.B(0.1,0.05,3.9,0.75,0,34,"#8d97a6",top="#e8edf3",lc="#a9b3c0",rc="#6f7a89")
    # ocak gözleri
    for u in (0.6,1.3,2.6,3.3):
        c.d.ellipse([*(c.Pt(u,0.4,34)[0]-9,c.Pt(u,0.4,34)[1]-4,),c.Pt(u,0.4,34)[0]+9,c.Pt(u,0.4,34)[1]+4],fill="#2a2a32",outline=OUT)
        c.d.ellipse([c.Pt(u,0.4,34)[0]-4,c.Pt(u,0.4,34)[1]-2,c.Pt(u,0.4,34)[0]+4,c.Pt(u,0.4,34)[1]+2],fill="#f97316")
    # fırın kapakları
    for u in (0.3,1.1,2.4,3.2):
        c.Poly([(u,0.75,6),(u+0.6,0.75,6),(u+0.6,0.75,26),(u,0.75,26)],"#4b5563")
        c.Poly([(u+0.08,0.75,16),(u+0.52,0.75,16),(u+0.52,0.75,22),(u+0.08,0.75,22)],"#94a3b8")
    # aspiratör
    c.B(0.8,0.05,3.2,0.7,78,96,"#b9c2cf",top="#e5e9ef",lc="#a5afbc",rc="#7f8b9a")
    c.Cyl(2.0,0.35,0.22,96,122,"#9aa3b1")
    c.B(0.85,0.06,0.97,0.18,34,80,"#9aa3b1"); c.B(3.03,0.06,3.15,0.18,34,80,"#9aa3b1")
    # asılı tavalar
    for u,col in ((1.0,"#2b2f3b"),(1.6,"#3b3f4a"),(2.4,"#2b2f3b")):
        p=c.Pt(u,0.75,70); c.d.ellipse([p[0]-8,p[1]-5,p[0]+8,p[1]+5],fill=col,outline=OUT)
        c.d.line([(p[0]+8,p[1]),(p[0]+18,p[1]-4)],fill="#6b7280",width=2)
    # ada tezgâh
    c.B(0.3,1.05,3.7,1.7,0,30,"#f1f5f9",top="#ffffff",lc="#e2e8f0",rc="#b8c2d0")
    c.B(0.25,1.0,3.75,1.75,30,34,"#c28a52",top="#e0a566",lc="#a9733f",rc="#7e5530")
    # tencere ve doğrama tahtası
    c.Cyl(1.0,1.35,0.22,34,48,"#b8c0cc")
    c.Cyl(1.0,1.35,0.24,48,50,"#e5e9ef")
    c.B(2.0,1.15,2.8,1.6,34,36,"#e8c48a",top="#f3d9a8")
    c.Sph(2.6,1.35,40,5,"#ef4444")
    c.Cyl(3.3,1.35,0.2,34,42,"#dc2626")
    return c
kit=kitchen(); metas['kitchen_block']=kit.save2('kitchen_block',4,2)

# ---------------- Ambar 4x3 ----------------
def barn():
    c=Big(4,3)
    RED="#b3262c"
    # silo (arka sağ)
    c.Cyl(3.55,0.55,0.42,0,92,"#d8dde5")
    c.Cyl(3.55,0.55,0.43,92,96,"#9aa3b1")
    c.Sph(3.55,0.55,98,17,"#aab3c1")
    # ambar gövdesi
    c.B(0.15,0.3,3.1,2.8,0,62,RED,top="#8c1c20",lc="#c9323a",rc="#8c1c20")
    # çatı: sırt u ekseninde, v=1.55'te
    P=c.Pt
    c.Poly([(0.05,2.9,60),(3.2,2.9,60),(3.2,1.55,106),(0.05,1.55,106)],"#5a2d1c")      # ön-sol eğim
    c.Poly([(3.2,2.9,60),(3.2,0.2,60),(3.2,1.55,106)],"#8c1c20")                     # sağ alın (üçgen)
    c.Poly([(0.05,2.9,60),(3.2,2.9,60),(3.2,2.9,64),(0.05,2.9,64)],"#f1e6d0")        # saçak
    # çatı çizgileri
    for i in range(1,8):
        u=0.05+i*0.39
        a=P(u,2.9,60); b=P(u,1.55,106); c.d.line([a,b],fill="#40200f")
    # büyük çift kapı (ön-sol yüz v=2.8)
    c.Poly([(0.9,2.8,2),(2.3,2.8,2),(2.3,2.8,48),(0.9,2.8,48)],"#f5efe0")
    c.Poly([(0.98,2.8,6),(2.22,2.8,6),(2.22,2.8,44),(0.98,2.8,44)],"#a9202a")
    for (a,b) in (((0.98,6),(1.6,44)),((1.6,6),(0.98,44)),((1.6,6),(2.22,44)),((2.22,6),(1.6,44))):
        c.d.line([P(a[0],2.8,a[1]),P(b[0],2.8,b[1])],fill="#f5efe0",width=2)
    c.Poly([(1.58,2.8,2),(1.62,2.8,2),(1.62,2.8,48),(1.58,2.8,48)],"#f5efe0")
    # çatı katı penceresi
    c.Poly([(1.35,2.85,66),(1.85,2.85,66),(1.85,2.85,80),(1.35,2.85,80)],"#f5efe0")
    # saman balyaları (ön sağ)
    c.B(3.3,1.6,3.9,2.2,0,18,"#e5b94a",top="#f3d27a",lc="#d3a53a",rc="#b78a28")
    c.B(3.35,2.3,3.9,2.8,0,16,"#e5b94a",top="#f3d27a",lc="#d3a53a",rc="#b78a28")
    return c
bn=barn(); metas['barn']=bn.save2('barn',4,3)
json.dump(metas,open('tools/metas-big.json','w'),indent=1)
print(metas)
