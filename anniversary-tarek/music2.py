import numpy as np, json
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
TL=json.load(open('timeline.json')); S=TL['S']; TOTAL=TL['total']
SR=44100; BPM=68; BEAT=60/BPM; BAR=4*BEAT
N=int((TOTAL+1)*SR); rng=np.random.default_rng(3)
L={k:np.zeros(N) for k in "piano arp pad str cello bell box kick sfx bass".split()}
hz=lambda m:440*2**((m-69)/12)
NOTE={"C":0,"D":2,"E":4,"F":5,"G":7,"A":9,"B":11}
def midi(s):
    n=NOTE[s[0]];i=1
    if s[i:i+1]=="#":n+=1;i+=1
    if s[i:i+1]=="b":n-=1;i+=1
    return 12*(int(s[i:])+1)+n
def add(l,t,sig):
    a=int(t*SR);b=min(N,a+len(sig))
    if 0<=a<N:L[l][a:b]+=sig[:b-a]
T=lambda d:np.arange(int(d*SR))/SR
def piano(f,d,v=.5):
    t=T(d+2.2);s=sum((1/n**1.6)*np.sin(2*np.pi*f*n*(1+.0004*n)*t)*np.exp(-(1.3+n*.8)*t) for n in range(1,9))
    r=np.ones_like(t);k=int(d*SR);r[k:]=np.exp(-(t[k:]-d)*3)
    return v*s*np.minimum(1,t/.004)*r
def pad(fs,d,v=.1):
    t=T(d+2);s=sum(np.sin(2*np.pi*f*(1+dd)*t+rng.random()*6)*.6+.2*np.sin(4*np.pi*f*(1+dd)*t) for f in fs for dd in(-.003,0,.003))
    r=np.ones_like(t);k=int(d*SR);r[k:]=np.exp(-(t[k:]-d)*2)
    return v*s*np.minimum(1,t/1.2)*r/len(fs)
def strings(f,d,v=.1,att=.6):
    t=T(d+1.4);vib=1+.0045*np.sin(2*np.pi*5*t)*np.minimum(1,t/.8);ph=2*np.pi*f*np.cumsum(vib)/SR
    s=sum((1/n)*np.sin(n*ph) for n in range(1,8))
    s=sosfilt(butter(1,2500,fs=SR,output='sos'),s)
    r=np.ones_like(t);k=int(d*SR);r[k:]=np.exp(-(t[k:]-d)*2.5)
    return v*s*np.minimum(1,t/att)*r
def bell(f,v=.15):
    t=T(3.5);return v*sum(a*np.sin(2*np.pi*f*p*t)*np.exp(-d*t) for p,a,d in[(1,1,1),(2.76,.5,2.2),(5.4,.25,3.5),(8.93,.12,5)])
def mbox(f,v=.14):
    t=T(1.6);return v*(np.sin(2*np.pi*f*t)*np.exp(-3*t)+.3*np.sin(8*np.pi*f*t)*np.exp(-7*t))
def kick(v=.5):
    t=T(.6);f=42+75*np.exp(-t*25);return v*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*6)
def noise_swell(d,v=.06,hp=2500):
    t=T(d);nz=sosfilt(butter(2,hp,btype='high',fs=SR,output='sos'),rng.standard_normal(len(t)));return v*nz*(t/d)**2.5
def boom(v=.6):
    t=T(3);f=38+30*np.exp(-t*6);lo=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*1.5)
    nz=sosfilt(butter(2,600,fs=SR,output='sos'),rng.standard_normal(len(t)))*np.exp(-t*3)
    return v*(lo+.4*nz)
def sc_of(t):
    for i in range(len(S)-1):
        if S[i]<=t<S[i+1]: return i
    return len(S)-2
# D major: Bm G D A
PROG=[("B2",["B3","D4","F#4"]),("G2",["G3","B3","D4"]),("D3",["D4","F#4","A4"]),("A2",["A3","C#4","E4"])]
MA=[[("F#5",2),("D5",1),("E5",1)],[("D5",1.5),("B4",.5),("B4",2)],[("A4",1),("D5",1),("F#5",1.5),("E5",.5)],[("E5",1),("C#5",1),("A4",2)]]
MB=[[("B5",2),("A5",1),("F#5",1)],[("G5",1.5),("F#5",.5),("D5",2)],[("F#5",1),("A5",1),("D6",1.5),("C#6",.5)],[("C#6",1),("B5",.5),("A5",.5),("E5",2)]]
INT={0:.3,1:.45,2:.5,3:.65,4:.5,5:.35,6:.5,7:.6,8:1,9:.7,10:.45,11:.7,12:.4,13:.65,14:1,15:.5}
NB=int(np.ceil(TOTAL/BAR))
for b in range(NB):
    t0=b*BAR; sc=sc_of(t0+.01); I=INT[sc]; last=t0+BAR>TOTAL-4
    tr=2 if sc>=14 else 0
    bass,ch=PROG[b%4]; bm=midi(bass)+tr; cm=[midi(c)+tr for c in ch]
    if last: bm=midi("E3"); cm=[midi(c) for c in["E4","G#4","B4"]]
    add('bass',t0,piano(hz(bm-12),BAR*(1.8 if last else 1),.42))
    add('pad',t0,pad([hz(m) for m in cm],BAR*(2 if last else 1),.06+.08*I))
    if sc in(5,12): add('cello',t0,strings(hz(bm),BAR,.07,1.0))
    if last: break
    # arpeggio: sparse in sad scenes
    pat=[bm,cm[0],cm[1],cm[2],cm[0]+12,cm[2],cm[1],cm[0]]
    step=1 if I>=.45 else 2
    for i in range(0,8,step):
        add('arp',t0+i*BEAT/2,piano(hz(pat[i]),BEAT*.75,.14+.08*I))
    if sc>=1:
        mel=(MA if (b//4)%2==0 else MB)[b%4]; tt=t0
        for n,d in mel:
            m=midi(n)+tr
            add('piano',tt,piano(hz(m),d*BEAT,.2+.12*I))
            if sc in(4,11,13): add('box',tt,mbox(hz(m+12),.09))
            if I>=.65: add('str',tt,strings(hz(m-12),d*BEAT,.05*I))
            tt+=d*BEAT
    if I>=.6:
        for m in cm: add('str',t0,strings(hz(m-12),BAR,.03*I))
        add('cello',t0,strings(hz(bm-12),BAR,.05*I,.8))
    if I>=.65 and sc not in(12,):
        for k in range(4):
            if k in(0,2): add('kick',t0+k*BEAT,kick(.32 if I<1 else .45))
# scene accents
for i,s in enumerate(S[1:-1],1):
    f=hz(midi("A5")+(2 if i>=14 else 0))
    add('bell',s,bell(f,.10))
    add('sfx',max(0,s-1.2),noise_swell(1.2,.03))
for s in (S[8],S[14]):
    add('sfx',s-3.5,noise_swell(3.5,.08)); add('sfx',s,boom(.5))
    for i in range(7): add('bell',s+i*.07,bell(hz(midi("D6")+(2 if s==S[14] else 0)+[0,4,7,12,7,4,0][i]),.05))
mix={'piano':1,'arp':.8,'pad':.9,'str':1,'cello':.9,'bell':.8,'box':.9,'kick':.8,'sfx':1,'bass':.7}
music=sum(L[k]*w for k,w in mix.items())
ir=lambda sd:np.random.default_rng(sd).standard_normal(int(3*SR))*np.exp(-np.arange(int(3*SR))/SR*2.2)*.018
wet=music-L['kick']*.8
mL=music*.8+fftconvolve(wet,ir(1))[:N]*.6; mR=music*.8+fftconvolve(wet,ir(2))[:N]*.6
st=np.stack([mL,mR],1); st/=np.max(np.abs(st))
# VO + ducking
vsr,vo=wavfile.read('vo_track.wav'); vo=vo.astype(float)/32768
from scipy.signal import resample_poly
vo=resample_poly(vo,SR,vsr)[:N]; vo=np.pad(vo,(0,N-len(vo)))
env=np.abs(vo); win=int(.25*SR)
env=np.convolve(env,np.ones(win)/win,'same'); env=np.clip(env/np.percentile(env[env>1e-4],60),0,1)
# smooth release
from scipy.ndimage import maximum_filter1d, uniform_filter1d
env=uniform_filter1d(maximum_filter1d(env,int(.6*SR)),int(.4*SR))
duck=1-.6*env
st=st*duck[:,None]*.55
fo=int(5*SR); end=int(TOTAL*SR); st[end-fo:end]*=np.linspace(1,0,fo)[:,None]**2; st[end:]=0
wavfile.write('music_only.wav',SR,(np.tanh(st/ .9)*.9*32767).astype(np.int16))
mixd=st+np.stack([vo,vo],1)*1.0
mixd=mixd[:end]; mixd=np.tanh(mixd/np.max(np.abs(mixd))*1.15)*.9
wavfile.write('mix_pre.wav',SR,(mixd*32767).astype(np.int16))
print('ok',TOTAL,NB)
