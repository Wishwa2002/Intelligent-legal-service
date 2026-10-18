from pathlib import Path
from copy import deepcopy
from docx import Document
from docx.oxml.ns import qn
from pypdf import PdfReader
import re,json
from lxml import etree
O=Path('qmse-output/final-audit/member-contribution-cleanup');n='SE3110_Testing_Report_GR42_Consolidated_Final';path=Path('qmse-output/final-audit/final-report')/f'{n}.docx';D=Document(path);old=Document(O/'report-before'/f'{n}.docx');ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
# Restore original TOC bookmark identities for the replaced member headings.
for p in old.paragraphs:
 if p.style.name in ['Heading 1','Heading 2'] and p.text.startswith(('9. ','9.1 ','9.2 ','9.3 ','9.4 ')):
  target=next(x for x in D.paragraphs if x.text==p.text)
  for e in p._p:
   if e.tag in [qn('w:bookmarkStart'),qn('w:bookmarkEnd')]:target._p.insert(1,deepcopy(e))
texts=[p.extract_text() or '' for p in PdfReader(next((O/'render').glob('*.pdf'))).pages]
norm=lambda t:re.sub(r'\s+','',t).casefold();updates=[]
for node in D._element.body:
 if node.tag.endswith('sdt'):
  for p in node.xpath('.//w:p',namespaces=ns):
   ts=etree.XPath('.//w:t',namespaces=ns)(p)
   if len(ts)<2 or not (ts[-1].text or '').isdigit():continue
   title=''.join(t.text or '' for t in ts[:-1]);matches=[i+1 for i,text in enumerate(texts) if i>1 and norm(title) in norm(text)]
   assert matches,title
   actual=matches[0];prior=ts[-1].text;ts[-1].text=str(actual)
   updates.append({'heading':title,'before':prior,'after':actual})
D.save(path);(O/'toc-verification.json').write_text(json.dumps(updates,indent=2));print('TOC entries checked:',len(updates),'changed:',sum(str(x['after'])!=x['before'] for x in updates),'bookmarks preserved.')
