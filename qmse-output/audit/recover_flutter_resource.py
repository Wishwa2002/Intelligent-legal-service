import urllib.request,io,zipfile,pathlib,json
url='https://storage.googleapis.com/flutter_infra_release/flutter/692136cb6582dbfc5af3fb33c2515a069f2f66d0/dart-sdk-darwin-arm64.zip'
class Remote(io.RawIOBase):
 def __init__(self):
  r=urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=20);self.n=int(r.headers['Content-Length']);self.p=0
 def seekable(self):return True
 def readable(self):return True
 def tell(self):return self.p
 def seek(self,o,w=0):self.p=o if w==0 else self.p+o if w==1 else self.n+o;return self.p
 def read(self,n=-1):
  n=min(n if n>=0 else self.n-self.p,self.n-self.p)
  if n<=0:return b''
  req=urllib.request.Request(url,headers={'Range':f'bytes={self.p}-{self.p+n-1}'})
  with urllib.request.urlopen(req,timeout=30) as r:
   if r.status!=206:raise RuntimeError('Server ignored range; refusing full download')
   b=r.read()
  self.p+=len(b);return b
with zipfile.ZipFile(Remote()) as z:
 name='dart-sdk/bin/resources/devtools/version.json';data=z.read(name);p=pathlib.Path('/private/tmp/qmse-flutter-source/bin/cache')/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);print('Recovered original resource:',data.decode())
