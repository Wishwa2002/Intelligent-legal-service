import subprocess,os,json,time,datetime,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[2]; name=sys.argv[1]; cwd=root/sys.argv[2]; command=sys.argv[3:]; out=root/'qmse-output/test-results'; env=os.environ.copy()
for k in list(env):
 if k.startswith(('MEMBER1_TEST_', 'LAWYER_MOBILE_TEST_', 'E2E_', 'GEMINI_', 'GOOGLE_API', 'AI_INTERNAL')): env.pop(k)
env.update({'GEMINI_API_KEY':'qmse-synthetic-not-a-real-provider-key','GOOGLE_API_KEY':'qmse-synthetic-not-a-real-provider-key','PYTHON_DOTENV_DISABLED':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','DOTNET_CLI_HOME':str(root/'qmse-output/.dotnet'),'NUGET_PACKAGES':os.path.expanduser('~/.nuget/packages')})
if os.getenv('QMSE_ISOLATED_POSTGRES'): env['MEMBER1_TEST_POSTGRES']=os.environ['QMSE_ISOLATED_POSTGRES']; env['LAWYER_MOBILE_TEST_POSTGRES']=os.environ['QMSE_ISOLATED_POSTGRES']
start=datetime.datetime.now(datetime.timezone.utc); t=time.monotonic(); code=None; timeout=False
with (out/(name+'.log')).open('w') as f:
 f.write('START UTC '+start.isoformat()+'\nCOMMAND '+repr(command)+'\nCWD '+str(cwd)+'\n'); f.flush()
 try:
  p=subprocess.Popen(command,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT,start_new_session=True); code=p.wait(timeout=420)
 except subprocess.TimeoutExpired:
  import signal; os.killpg(p.pid,signal.SIGTERM); code=p.wait(); timeout=True
 except OSError as e: f.write(str(e)+'\n'); code=127
result={'name':name,'command':command,'cwd':str(cwd),'started_utc':start.isoformat(),'ended_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'duration_seconds':round(time.monotonic()-t,3),'exit_code':code,'timed_out':timeout,'environment':'macOS ARM64; isolated fixtures; external AI keys disabled','log':str((out/(name+'.log')).relative_to(root))}; (out/(name+'.json')).write_text(json.dumps(result,indent=2)); print(json.dumps(result))
