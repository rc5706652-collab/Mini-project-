// A tiny dependency-free static server for Playwright smoke tests.
// Uses Node.js rather than relying on Python being present in CI containers.
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
const root=resolve("public");
const mime={
 ".html":"text/html; charset=utf-8",
 ".js":"text/javascript; charset=utf-8",
 ".mjs":"text/javascript; charset=utf-8",
 ".css":"text/css; charset=utf-8",
 ".json":"application/json; charset=utf-8",
 ".svg":"image/svg+xml",
 ".png":"image/png",
 ".jpg":"image/jpeg",
 ".jpeg":"image/jpeg",
 ".ico":"image/x-icon",
 ".webm":"audio/webm",
 ".wav":"audio/wav",
 ".mp3":"audio/mpeg"
};
export async function startStaticServer(port){
 const server=createServer(async(req,res)=>{
  try{
   if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405).end();return;}
   const url=new URL(req.url,"http://localhost");
   const pathname=decodeURIComponent(url.pathname);
   const name=pathname==="/"?"/index.html":pathname;
   const filename=resolve(root,"."+name);
   if(!filename.startsWith(root+sep)){res.writeHead(403).end();return;}
   const data=await readFile(filename);
   res.setHeader("Content-Type",mime[extname(filename)]||"application/octet-stream");
   res.setHeader("Cache-Control","no-store");
   res.statusCode=200;
   if(req.method==="HEAD")res.end();else res.end(data);
  }catch(err){res.writeHead(err instanceof URIError?400:404).end("Not found");}
 });
 await new Promise((yes,no)=>{server.once("error",no);server.listen(port,"127.0.0.1",yes);});
 return server;
}
