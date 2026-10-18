from PIL import Image,ImageDraw
from pathlib import Path
import pymupdf,json
O=Path('qmse-output/historical-resolution');d=pymupdf.open(O/'final-report/SE3110_Testing_Report_GR42_Historical_Verification.pdf');V=O/'audit/visual';V.mkdir(exist_ok=True);manifest=[]
for start in range(0,len(d),6):
 sheet=Image.new('RGB',(1600,1900),'#dddddd');draw=ImageDraw.Draw(sheet)
 for j in range(6):
  i=start+j
  if i>=len(d):break
  px=d[i].get_pixmap(matrix=pymupdf.Matrix(1.3,1.3));im=Image.frombytes('RGB',[px.width,px.height],px.samples);im.thumbnail((780,600));x=(j%2)*800+(800-im.width)//2;y=(j//2)*630+28;sheet.paste(im,(x,y));draw.text(((j%2)*800+15,(j//2)*630+8),'PAGE '+str(i+1),fill='black');manifest.append({'page':i+1,'contact':f'contact-{start+1:03d}.png','images':len(d[i].get_image_info()),'text_chars':len(d[i].get_text())})
 sheet.save(V/f'contact-{start+1:03d}.png')
(O/'audit/visual-contact-manifest.json').write_text(json.dumps(manifest,indent=2));print('Final pages',len(d))
