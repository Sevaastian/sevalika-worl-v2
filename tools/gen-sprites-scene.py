import json
head = open("tools/gen-sprites-big.py").read().split("\nmetas={}\n")[0]
ns={}; exec(head, ns)
Big=ns['Big']; shade=ns['shade']; OUT=ns['OUT']
metas={}
def fin(c,name,w,h): metas[name]=c.save2(name,w,h)

def fish_hut():
    c=Big(3,2)
    c.B(0.15,0.2,2.75,1.7,0,52,"#6f8fa8",top="#58758c",lc="#7fa0ba",rc="#587890")
    P=c.Pt
    for i in range(1,9):  # tahta çizgileri (ön yüz)
        u=0.15+i*0.325; c.d.line([P(u,1.7,1),P(u,1.7,51)],fill="#4f6b82")
    # çatı (sırt u ekseninde)
    c.Poly([(0.0,1.85,50),(2.9,1.85,50),(2.9,0.95,88),(0.0,0.95,88)],"#2c7a7b")
    c.Poly([(2.9,1.85,50),(2.9,0.05,50),(2.9,0.95,88)],"#1f5c5d")
    for i in range(1,8):
        u=i*0.36; c.d.line([P(u,1.85,50),P(u,0.95,88)],fill="#1c5253")
    # kapı ve pencere
    c.Poly([(0.45,1.7,2),(1.05,1.7,2),(1.05,1.7,40),(0.45,1.7,40)],"#7a4a22")
    c.Poly([(1.5,1.7,18),(2.4,1.7,18),(2.4,1.7,40),(1.5,1.7,40)],"#f5efe0")
    c.Poly([(1.56,1.7,22),(2.34,1.7,22),(2.34,1.7,36),(1.56,1.7,36)],"#9ad7f0")
    # tabela
    c.Poly([(0.5,1.72,44),(1.9,1.72,44),(1.9,1.72,50),(0.5,1.72,50)],"#f5efe0")
    # balık askısı + fıçılar
    c.B(2.6,0.4,2.75,1.5,0,2,"#8b5a2b")
    for v,col in ((0.6,"#f1f5f9"),(0.95,"#94a3b8"),(1.3,"#f1f5f9")):
        p=P(2.75,v,30); c.d.ellipse([p[0]-6,p[1]-3,p[0]+6,p[1]+3],fill=col,outline=OUT)
    c.Cyl(0.35,0.2,0.0,0,0,"#000") if False else None
    c.Cyl(0.0+0.35,1.95,0.2,0,22,"#8b5a2b"); c.Cyl(0.0+0.9,1.95,0.18,0,18,"#a56b34")
    return c
fin(fish_hut(),'fish_hut',3,2)

def mine_entrance():
    c=Big(4,2)
    P=c.Pt
    G1=("#7b7673","#948f8b","#8a8582","#5d5856")
    G2=("#6a6562","#827d79","#76716e","#4d4947")
    def rock(u0,v0,u1,v1,z0,z1,g): c.B(u0,v0,u1,v1,z0,z1,g[0],top=g[1],lc=g[2],rc=g[3])
    # arka büyük kaya kütlesi
    rock(0.3,0.15,3.7,1.0,0,96,G2)
    rock(0.9,0.15,3.1,0.8,96,118,G1)
    # sol ve sağ sütun kayalar (aşamalı)
    rock(0.1,0.9,1.25,1.85,0,56,G1); rock(0.2,1.0,1.1,1.75,56,78,G2); rock(0.1,0.9,0.75,1.5,78,92,G1)
    rock(2.75,0.9,3.9,1.85,0,52,G1); rock(2.85,1.0,3.75,1.75,52,74,G2)
    # lento kayası
    rock(1.1,0.95,2.9,1.8,58,82,G1)
    # tünel ağzı (ön yüz v=1.8 üzerinde, sadece açıklıkta)
    c.Poly([(1.25,1.78,0),(2.75,1.78,0),(2.75,1.78,58),(1.25,1.78,58)],"#0b090f")
    c.Poly([(1.35,1.78,0),(2.65,1.78,0),(2.65,1.78,50),(1.35,1.78,50)],"#17131c")
    # ahşap destek
    c.B(1.18,1.74,1.34,1.9,0,62,"#8b5a2b"); c.B(2.66,1.74,2.82,1.9,0,62,"#8b5a2b")
    c.B(1.1,1.72,2.9,1.92,56,64,"#a56b34")
    # raylar
    for u in (1.6,2.4):
        c.d.line([P(u,1.8,0),P(u+0.15,2.4,-8)],fill="#9ca3af",width=2)
    for k in range(3):
        c.d.line([P(1.45,1.9+k*0.18,-1-k*2),P(2.55,1.9+k*0.18,-1-k*2)],fill="#6b4a2a",width=2)
    # fener
    c.B(1.05,1.8,1.12,1.88,38,58,"#6b4a2a"); c.Sph(1.085,1.92,34,5,"#ffd966")
    # tabela
    c.Poly([(1.45,1.93,70),(2.55,1.93,70),(2.55,1.93,82),(1.45,1.93,82)],"#7a4a22")
    c.Poly([(1.52,1.93,73),(2.48,1.93,73),(2.48,1.93,79),(1.52,1.93,79)],"#fbbf24")
    # cevher kristalleri
    for u,v,z,col in ((0.35,1.86,30,"#38bdf8"),(0.7,1.88,16,"#a78bfa"),(3.3,1.86,26,"#38bdf8"),(3.6,1.86,40,"#facc15"),(3.1,1.88,12,"#34d399")):
        c.Sph(u,v,z,4,col)
    return c
fin(mine_entrance(),'mine_entrance',4,2)

def ore_cart():
    c=Big(1,1)
    c.B(0.12,0.2,0.88,0.8,8,26,"#6b5b4a",top="#4a3d30",lc="#7d6b58",rc="#554838")
    for (u,v,col) in ((0.3,0.5,"#38bdf8"),(0.55,0.4,"#facc15"),(0.6,0.62,"#94a3b8"),(0.38,0.65,"#facc15")):
        c.Sph(u,v,28,5,col)
    for u,v in ((0.2,0.82),(0.78,0.82)):
        c.Cyl(u,v,0.1,0,7,"#2b2f3b")
    return c
fin(ore_cart(),'ore_cart',1,1)

def bus_stop():
    c=Big(3,1)
    P=c.Pt
    c.B(0.1,0.08,0.2,0.2,0,78,"#2c5aa0"); c.B(2.8,0.08,2.9,0.2,0,78,"#2c5aa0")
    c.B(0.05,0.0,2.95,0.9,78,86,"#2c5aa0",top="#4a7bc8",lc="#2c5aa0",rc="#1d3f70")
    # cam arka
    c.Poly([(0.2,0.12,12),(2.8,0.12,12),(2.8,0.12,76),(0.2,0.12,76)],"#bfe3f2")
    for u in (0.2,1.07,1.93,2.8): c.d.line([P(u,0.12,12),P(u,0.12,76)],fill="#5b7fa8",width=1)
    # bank
    c.B(0.5,0.35,2.5,0.7,0,16,"#7a4a22",top="#a56b34")
    # tabela direği
    c.B(2.9,0.5,3.0,0.62,0,70,"#9aa3b1")
    c.Poly([(2.72,0.56,70),(3.18,0.56,70),(3.18,0.56,92),(2.72,0.56,92)],"#2563eb")
    c.Poly([(2.78,0.56,76),(3.12,0.56,76),(3.12,0.56,86),(2.78,0.56,86)],"#f8fafc")
    return c
fin(bus_stop(),'bus_stop',3,1)

def phone_booth():
    c=Big(1,1)
    c.B(0.2,0.2,0.8,0.8,0,64,"#c0263f",top="#e5485f",lc="#d23a50",rc="#8f1b2f")
    P=c.Pt
    c.Poly([(0.28,0.8,10),(0.72,0.8,10),(0.72,0.8,54),(0.28,0.8,54)],"#a8dcef")
    c.Poly([(0.8,0.28,10),(0.8,0.72,10),(0.8,0.72,54),(0.8,0.28,54)],"#a8dcef")
    c.B(0.17,0.17,0.83,0.83,60,66,"#8f1b2f",top="#c0263f")
    return c
fin(phone_booth(),'phone_booth',1,1)

def store(name,wall,roof,sign,accent,items):
    c=Big(4,2)
    P=c.Pt
    c.B(0.05,0.1,3.95,1.0,0,92,wall,top=roof,lc=shade(wall,1.1) if False else wall,rc=shade(wall,0.8) if False else wall)
    # vitrin (ön yüz v=1.0)
    c.Poly([(0.35,1.0,6),(3.65,1.0,6),(3.65,1.0,56),(0.35,1.0,56)],"#cfeaf5")
    for u in (0.35,1.18,2.0,2.82,3.65): c.d.line([P(u,1.0,6),P(u,1.0,56)],fill="#6b8fa8",width=1)
    # kapı
    c.Poly([(1.7,1.0,6),(2.3,1.0,6),(2.3,1.0,52),(1.7,1.0,52)],"#7fc0dc")
    c.Poly([(1.98,1.0,6),(2.02,1.0,6),(2.02,1.0,52),(1.98,1.0,52)],"#4b6e86")
    # tente
    c.Poly([(0.2,1.0,58),(3.8,1.0,58),(3.8,1.35,50),(0.2,1.35,50)],accent)
    for i in range(0,9,2):
        u0=0.2+i*0.4; c.Poly([(u0,1.0,58),(u0+0.4,1.0,58),(u0+0.4,1.35,50),(u0,1.35,50)],"#f8fafc")
    # tabela
    c.Poly([(0.5,1.0,64),(3.5,1.0,64),(3.5,1.0,86),(0.5,1.0,86)],sign)
    c.Poly([(0.58,1.0,67),(3.42,1.0,67),(3.42,1.0,83),(0.58,1.0,83)],"#fff7e0")
    for k,(u,col) in enumerate(items):
        c.Sph(u,1.0,26,6,col)
    return c
fin(store('s',"#d9a6c2","#c07aa3","#c2415d","#e25a82",[(0.7,"#f472b6"),(1.0,"#a78bfa"),(2.8,"#38bdf8"),(3.2,"#facc15")]),'store_fashion',4,2)
fin(store('t',"#8fb4d9","#6b95c0","#1d4ed8","#2563eb",[(0.7,"#0f172a"),(1.0,"#94a3b8"),(2.8,"#22d3ee"),(3.2,"#e2e8f0")]),'store_tech',4,2)
fin(store('f',"#e0b88a","#c4915c","#c2570c","#f97316",[(0.7,"#ef4444"),(1.0,"#facc15"),(2.8,"#84cc16"),(3.2,"#fb923c")]),'store_food',4,2)

def mannequin():
    c=Big(1,1)
    c.Cyl(0.5,0.5,0.28,0,4,"#5b4636")
    c.B(0.46,0.46,0.54,0.54,4,34,"#9aa3b1")
    c.B(0.3,0.35,0.7,0.65,34,66,"#e25a82",top="#f472b6",lc="#e25a82",rc="#b8436a")
    c.Sph(0.5,0.5,74,7,"#e8d5c0")
    return c
fin(mannequin(),'mannequin',1,1)

def bed():
    c=Big(2,1)
    c.B(0.05,0.1,1.95,0.95,6,22,"#7a4a22",top="#a56b34",lc="#7a4a22",rc="#5e3818")
    c.B(0.1,0.15,1.9,0.9,22,32,"#f8fafc",top="#ffffff",lc="#e2e8f0",rc="#cbd5e1")
    c.B(0.1,0.15,1.2,0.9,32,36,"#60a5fa",top="#7cb8fb",lc="#60a5fa",rc="#3b82f6")
    c.B(1.3,0.2,1.85,0.85,32,38,"#fde68a",top="#fef3c7",lc="#fde68a",rc="#e5c96a")
    c.B(0.02,0.08,0.12,0.97,6,52,"#5e3818")
    return c
fin(bed(),'bed',2,1)
json.dump(metas,open('tools/metas-scene.json','w'),indent=1); print(metas)
