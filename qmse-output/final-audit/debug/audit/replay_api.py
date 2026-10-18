from pathlib import Path
p=Path('backend/LegalService.Tests/historical_api_replay.py');s=p.read_text().replace('qmse-output/historical-resolution','qmse-output/final-audit/debug').replace('/private/tmp/qmse-history-control','/private/tmp/qmse-final-debug-control');exec(compile(s,str(p),'exec'),{'__file__':str(p.resolve()),'__name__':'__main__'})
