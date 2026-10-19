import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage as nd
IMG = sys.argv[1]; OUT = sys.argv[2]; BGMODE = sys.argv[3] if len(sys.argv)>3 else 'soft'
P = np.asarray(Image.open(IMG+'/_pre-sharpen/s6-cylinder-before.jpg').convert('RGB')).astype(np.float32)
O = np.asarray(Image.open(IMG+'/_orig/s6-cylinder-before.jpg').convert('RGB')).astype(np.float32)
H,W = P.shape[:2]
L,R,BOT,SURF = 270,346,527,262
ppm = (BOT-SURF)/60.0
y_of = lambda ml: BOT-ml*ppm

# ---- foreground masks (processing left cylinder + doll untouched, background changed)
d = np.abs(P-O).mean(2)
fg = d < 42
fg = nd.binary_opening(fg, iterations=1); fg = nd.binary_closing(fg, iterations=3); fg = nd.binary_fill_holes(fg)
cyl = np.zeros_like(fg); cyl[40:585, 228:388] = fg[40:585, 228:388]
lab,n = nd.label(cyl); sizes = nd.sum(cyl, lab, range(1,n+1)); cyl = lab == (1+np.argmax(sizes))
cyl = nd.binary_fill_holes(cyl)
lim = np.zeros_like(cyl); lim[40:530, 262:355] = True; lim[525:585, 228:388] = True
cyl &= lim
doll = np.zeros_like(fg); doll[398:565, 385:478] = fg[398:565, 385:478]
lab,n = nd.label(doll); sizes = nd.sum(doll, lab, range(1,n+1)); doll = lab == (1+np.argmax(sizes))
doll = nd.binary_erosion(nd.binary_fill_holes(nd.binary_closing(doll, iterations=2)), iterations=2)

def feather(m, r=1.2): return np.clip(nd.gaussian_filter(m.astype(np.float32), r), 0, 1)[...,None]

# ---- erase the garbled scale inside the glass
C = P.copy()
x0,x1 = L+4, R-3
for s,e in [(int(y_of(112)), SURF-3), (SURF+4, BOT-4)]:
    blk = nd.median_filter(C[s:e,x0:x1], size=(17,1,1), mode='nearest')
    blk = nd.gaussian_filter1d(blk, 3, axis=0, mode='nearest')
    w = x1-x0; fe = np.clip(np.minimum(np.arange(w), w-1-np.arange(w))/4, 0, 1)[None,:,None]
    C[s:e,x0:x1] = C[s:e,x0:x1]*(1-fe) + blk*fe

# ---- soft background from the original photo
def inpaint(img, mask, it=800):
    f = img.copy(); f[mask] = np.nan
    for _ in range(it):
        nb = np.stack([np.roll(f,1,0),np.roll(f,-1,0),np.roll(f,1,1),np.roll(f,-1,1)])
        with np.errstate(all='ignore'): m = np.nanmean(nb, 0)
        f[mask] = np.where(np.isnan(m[mask]), f[mask], m[mask])
    return np.nan_to_num(f)
def soft_bg(src):
    b = nd.gaussian_filter(src, (9,9,0))
    g = b.mean(2, keepdims=True); b = g + (b-g)*0.45            # calmer colour
    tone = np.array([236,240,244], np.float32)
    return b*0.55 + tone*0.45                                     # lighter, low contrast

def build(after):
    src = O.copy()
    if after:   # remove the standing doll + its reflection from the table
        hole = nd.binary_dilation(doll, iterations=4); hole[398:640, 380:485] |= False
        refl = np.zeros_like(doll); refl[555:650, 388:478] = True
        src = inpaint(src, hole | refl)
    bg = soft_bg(src)
    # soft darker halo behind the glass so it still reads on a light background
    halo = nd.gaussian_filter(nd.binary_dilation(cyl, iterations=3).astype(np.float32), 9)[...,None]
    bg = bg*(1-0.30*halo)
    out = bg.copy()
    fgm = cyl | (doll if not after else np.zeros_like(doll))
    fm = feather(fgm)
    out = out*(1-fm) + C*fm
    if after:
        # raise water 60 -> 75 mL
        NS = int(round(y_of(75)))
        a0,a1 = L-3, R+4
        air = out[NS-12:SURF-6, a0:a1].mean(0); wat = out[SURF+8:SURF+30, a0:a1].mean(0)
        ratio = wat/np.maximum(air,1)
        line = out[SURF-3:SURF+4, L-2:R+3].copy()
        out[NS:SURF+4, a0:a1] = out[NS:SURF+4, a0:a1]*ratio[None]
        out[SURF-3:SURF+4, a0:a1] = out[SURF+8:SURF+15, a0:a1]
        out[SURF-10:SURF+16, a0:a1] = nd.gaussian_filter1d(out[SURF-10:SURF+16, a0:a1], 4, axis=0, mode='nearest')
        out[NS-3:NS+4, L-2:R+3] = line
        # doll into the water, resting on the bottom
        ys,xs = np.where(doll); y0,y1,x0_,x1_ = ys.min(),ys.max()+1,xs.min(),xs.max()+1
        crop = Image.fromarray(P[y0:y1,x0_:x1_].astype(np.uint8)); mcrop = Image.fromarray((doll[y0:y1,x0_:x1_]*255).astype(np.uint8))
        tw = 60; th = round((y1-y0)*tw/(x1_-x0_))
        crop = np.asarray(crop.resize((tw,th), Image.LANCZOS)).astype(np.float32)
        mc = np.asarray(mcrop.resize((tw,th), Image.LANCZOS)).astype(np.float32)[...,None]/255
        crop = crop*(0.82+0.18*ratio.mean(0)/ratio.mean())            # seen through water
        crop = crop*0.85 + np.array([90,140,190],np.float32)*0.15
        cx = (L+R)//2; px = cx-tw//2; py = BOT-2-th
        reg = out[py:py+th, px:px+tw]
        out[py:py+th, px:px+tw] = reg*(1-mc*0.96) + crop*mc*0.96
    # ---- clean scale on the glass
    K=4; ov = Image.new('L',(W*K,H*K),0); dr = ImageDraw.Draw(ov); iw = R-L
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', round(iw*0.25)*K, index=1)
    tx = L+iw*0.10
    for ml in range(5, 96, 5):
        y = y_of(ml); major = ml%10==0; ln = iw*(0.50 if major else 0.30); th_ = 1.6 if major else 1.2
        dr.rectangle([tx*K,(y-th_/2)*K,(tx+ln)*K,(y+th_/2)*K], fill=255)
        if major: dr.text(((tx+ln+iw*0.06)*K, y*K), str(ml), font=font, fill=255, anchor='lm')
    dr.text(((L+R)/2*K, (y_of(100)+4)*K), '100 mL', font=font, fill=255, anchor='mm')
    m = np.asarray(ov.resize((W,H), Image.LANCZOS)).astype(np.float32)[...,None]/255
    out = out*(1-m*0.92) + np.array([22,32,48],np.float32)*m*0.92
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))
build(False).save(OUT+'/before.jpg', quality=93, subsampling=0)
build(True).save(OUT+'/after.jpg', quality=93, subsampling=0)
print('new surface y', y_of(75), y_of(75)/H, 'old', SURF/H)
