"""Reproduce the release from the exact user-supplied base, never from an older app."""
import hashlib,json,pathlib,sys,urllib.request,zipfile
root=pathlib.Path(__file__).resolve().parent.parent
url='https://github.com/prachetas2003/Trial/releases/download/334455667788/Buildlings-Windows-x64.current.1.zip'
expected='bf2c97a24f8185f0e3755bbaedb39a37efb7785aae7841da26f609f3a24a58c2'
base=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else root/'.tools/modified-base.zip'
if not base.exists():
 base.parent.mkdir(parents=True,exist_ok=True)
 urllib.request.urlretrieve(url,base)
assert hashlib.sha256(base.read_bytes()).hexdigest()==expected,'Modified base checksum mismatch'
output=root/'dist/Buildlings-Windows-x64.zip'
asar=(root/'dist/app.asar').read_bytes()
changed=[];preserved=0
with zipfile.ZipFile(base) as source,zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as dest:
 assert source.testzip() is None,'Modified base has a CRC error'
 for info in source.infolist():
  name='/'.join(info.filename.split('/')[1:])
  if not name or info.is_dir():continue
  assert not pathlib.PurePosixPath(name).is_absolute() and '..' not in pathlib.PurePosixPath(name).parts
  original=source.read(info)
  data=asar if name=='resources/app.asar' else original
  dest.writestr(name,data)
  if data!=original:changed.append(name)
  else:preserved+=1
 dest.writestr('TIMER_AND_MUSIC.txt',(root/'product/TIMER_AND_MUSIC.txt').read_bytes())
assert changed==['resources/app.asar'],changed
with zipfile.ZipFile(output) as z:assert z.testzip() is None,'Output CRC validation failed'
digest=hashlib.sha256(output.read_bytes()).hexdigest()
(root/'dist/SHA256SUMS.txt').write_text(digest+'  '+output.name+'\n',encoding='ascii')
report={'baseUrl':url,'baseSha256':expected,'changedBaseFiles':changed,'unchangedBaseFiles':preserved,'zipBytes':output.stat().st_size,'sha256':digest}
(root/'dist/modified-release-verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
