import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAccountServer} from './server.mjs';
import {createPreviewServer} from '../overseas-preview/server.mjs';
const port=Number(process.env.PORT||10002);
const origin=process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||`http://127.0.0.1:${port}`;
if(process.env.NODE_ENV==='production'&&(!origin.startsWith('https://')||!process.env.DATA_DIR||!path.isAbsolute(process.env.DATA_DIR)))throw Error('Production requires an HTTPS PUBLIC_ORIGIN and an absolute persistent DATA_DIR');
const here=path.dirname(fileURLToPath(import.meta.url));
const auth=createAccountServer({secure:origin.startsWith('https://'),trustedProxyIP:process.env.TRUSTED_PROXY_IP,trustCloudflare:origin.endsWith('.trycloudflare.com')||process.env.TRUST_CLOUDFLARE==='true',origin,productAdminPath:path.join(here,'../overseas-preview/public/admin/index.html')});
const storefront=createPreviewServer();
const server=http.createServer({maxHeaderSize:8192,requestTimeout:15000,headersTimeout:10000},(req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,origin).pathname);if(/[\\\x00-\x1f\x7f]/.test(pathname))throw Error('Invalid path')}catch{res.writeHead(400);res.end('Invalid path');return;}
 if(pathname==='/index.html'||pathname==='/agent/index.html'){res.writeHead(303,{Location:pathname==='/index.html'?'/':'/agent/'});res.end();return;}
 if(pathname==='/agent'||pathname==='/admin'){
  res.writeHead(303,{Location:pathname+'/'});res.end();return;
 }
 const accountRoute=['/','/healthz','/agent/','/agent/login','/agent/register','/login','/register','/app.js','/payment-qr.jpg'].includes(pathname)||pathname.startsWith('/agent/')||pathname.startsWith('/admin/')||pathname.startsWith('/api/');
 (accountRoute?auth:storefront).emit('request',req,res);
});
server.listen(port,process.env.HOST||(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'),()=>console.log('Integrated local preview: '+origin));
const stop=()=>server.close(()=>{auth.emit('close');process.exit(0)});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
