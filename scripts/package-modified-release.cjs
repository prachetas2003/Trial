// Patch the user's verified modified portable release, preserving its runtime and helpers.
const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {createPackage}=require('@electron/asar');
const root=path.resolve(__dirname,'..');
(async()=>{
 require('./compile-quotes.cjs');
 const stage=path.join(root,'.tools/modified-stage');
 await fs.rm(stage,{recursive:true,force:true});await fs.mkdir(stage,{recursive:true});
 await fs.cp(path.join(root,'desktop'),path.join(stage,'desktop'),{recursive:true});
 await fs.mkdir(path.join(stage,'site'),{recursive:true});
 await fs.copyFile(path.join(root,'site/core.js'),path.join(stage,'site/core.js'));
 await fs.writeFile(path.join(stage,'package.json'),JSON.stringify({name:'buildlings-desktop',version:require('../package.json').version,main:'desktop/main.cjs',description:'Mischief desktop companion'},null,2));
 await fs.mkdir(path.join(root,'dist'),{recursive:true});
 await createPackage(stage,path.join(root,'dist/app.asar'));
 const result=spawnSync(process.platform==='win32'?'python':'python3',[path.join(__dirname,'patch-modified-release.py'),...process.argv.slice(2)],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 process.exitCode=result.status??1;
})().catch(e=>{console.error(e);process.exitCode=1;});
