from pathlib import Path
import re,json
import pymupdf
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
R=Path(__file__).resolve().parents[2];O=R/'qmse-output';docpath=O/'final-report/SE3110_Testing_Report_GR42_Final.docx';pdf=O/'final-report/render-visual/SE3110_Testing_Report_GR42_Final.pdf';D=Document(docpath);ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def norm(s):return re.sub(r'\s+',' ',s).strip()
pages=[norm(p.get_text()) for p in pymupdf.open(pdf)];targets={}
for bm in D.element.findall('.//w:bookmarkStart',ns):
 name=bm.get(qn('w:name'))
 if not name or not name.startswith('_Toc'):continue
 el=bm
 while el is not None and el.tag!=qn('w:p'):el=el.getparent()
 if el is None:continue
 heading=norm(''.join(x.text or '' for x in el.findall('.//w:t',ns)))
 found=[i+1 for i,text in enumerate(pages) if i>=2 and heading in text]
 if found:targets[name]={'title':heading,'page':found[0]}
sdt=D.element.find('w:body/w:sdt',ns);count=0
for instr in sdt.findall('.//w:instrText',ns):
 match=re.search(r'PAGEREF\s+(\S+)',instr.text or '')
 if not match:continue
 target=targets.get(match.group(1))
 if not target:raise RuntimeError('No page verified for '+match.group(1))
 run=instr.getparent();sep=run.getnext()
 while sep is not None:
  fld=sep.find('w:fldChar',ns)
  if fld is not None and fld.get(qn('w:fldCharType'))=='separate':break
  sep=sep.getnext()
 if sep is None:raise RuntimeError('Missing field separator')
 rr=sep.getnext()
 while rr is not None:
  fld=rr.find('w:fldChar',ns)
  if fld is not None and fld.get(qn('w:fldCharType'))=='end':break
  following=rr.getnext();rr.getparent().remove(rr);rr=following
 nr=OxmlElement('w:r');tt=OxmlElement('w:t');tt.text=str(target['page']);nr.append(tt);sep.addnext(nr);count+=1
D.save(docpath);(O/'audit/toc-pages-visual.json').write_text(json.dumps(targets,indent=2));print('Verified/cached TOC entries',count)
