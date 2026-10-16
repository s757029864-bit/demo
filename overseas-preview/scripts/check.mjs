import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const pages=['index.html','agent/index.html','admin/index.html','guide/index.html'];
for(const page of pages){
  const html=await readFile(new URL('../public/'+page,import.meta.url),'utf8');
  if(html.includes('https://s757029864-bit.github.io/demo/ultraman/'))throw Error('Old origin found: '+page);
  const csp=html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
  if(!csp)throw Error('Missing CSP: '+page);
  for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
    const code=match[1].replace(/\r\n?/g,'\n');
    const hash="'sha256-"+createHash('sha256').update(code).digest('base64')+"'";
    if(!csp.includes(hash))throw Error('Invalid script hash: '+page);
  }
  if(page!=='guide/index.html'&&!html.includes('DEMO-'))throw Error('Missing demonstration mode: '+page);
}
console.log('PASS portable navigation and inline script hashes on four pages');
