import http from 'node:http';
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const mime={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};

export function createPreviewServer(){
  const server=http.createServer({maxHeaderSize:8192},async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Cache-Control','no-store');
    const send=(status,body,type='text/plain; charset=utf-8')=>{
      res.statusCode=status;res.setHeader('Content-Type',type);
      res.setHeader('Content-Length',Buffer.byteLength(body));
      res.end(req.method==='HEAD'?undefined:body);
    };
    try{
      const raw=req.url||'/';let urlPath;
      try{urlPath=decodeURIComponent(raw.split('?')[0]);}catch{return send(400,'Invalid request path');}
      if(!urlPath.startsWith('/')||urlPath.startsWith('//')||/[\\\x00-\x1f\x7f]/.test(urlPath)||urlPath.split('/').some(x=>x==='.'||x==='..'))return send(400,'Invalid request path');
      if(!['GET','HEAD'].includes(req.method)){
        req.resume();res.setHeader('Allow','GET, HEAD');
        return send(urlPath.startsWith('/api/')?503:405,urlPath.startsWith('/api/')?JSON.stringify({error:'DEMO_ONLY',message:'Real payment, inventory and authentication APIs are not enabled.'}):'Method not allowed',urlPath.startsWith('/api/')?'application/json; charset=utf-8':undefined);
      }
      if(urlPath==='/healthz')return send(200,JSON.stringify({status:'ok',mode:'demo',payments:'disabled',storage:'browser-local'}),'application/json; charset=utf-8');
      if(urlPath.startsWith('/api/'))return send(503,JSON.stringify({error:'DEMO_ONLY',message:'No production API is configured.'}),'application/json; charset=utf-8');
      if(urlPath.split('/').some(x=>x.startsWith('.')))return send(404,'Not found');
      let file=path.resolve(root,'.'+urlPath);
      if(file!==root&&!file.startsWith(root+path.sep))return send(404,'Not found');
      let info;
      try{info=await stat(file);}catch{return send(404,'Not found');}
      if(info.isDirectory()){
        if(!urlPath.endsWith('/')){
          const query=raw.includes('?')?raw.slice(raw.indexOf('?')):'';
          res.statusCode=308;res.setHeader('Location',urlPath.split('/').map(encodeURIComponent).join('/')+'/'+query);return res.end();
        }
        file=path.join(file,'index.html');
      }
      const ext=path.extname(file).toLowerCase();if(!mime[ext])return send(404,'Not found');
      let resolved;
      try{resolved=await realpath(file);}catch{return send(404,'Not found');}
      if(!resolved.startsWith(root+path.sep))return send(404,'Not found');
      const body=await readFile(resolved);
      if(ext==='.html'){
        const policy=body.toString('utf8').match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
        if(!policy)return send(500,'Preview policy is missing');
        res.setHeader('Content-Security-Policy',policy+"; frame-ancestors 'none'");
      }
      send(200,body,mime[ext]);
    }catch{
      if(!res.headersSent)send(500,'Unable to serve this preview');else res.destroy();
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  return server;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||10000);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
  const server=createPreviewServer();server.listen(port,'0.0.0.0',()=>console.log('Demo preview listening on port '+port));
  const stop=()=>server.close(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
