import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, root, three, dl, out] = process.argv;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.fbx': 'application/octet-stream', '.tga': 'application/octet-stream', '.glb': 'model/gltf-binary' };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'PUT' && u.startsWith('/out/')) {
    const f = path.join(out, path.basename(u)); const ws = fs.createWriteStream(f);
    req.pipe(ws); ws.on('finish', () => { res.end('ok ' + fs.statSync(f).size); }); return;
  }
  let f = null;
  if (u.startsWith('/three/')) f = path.join(three, u.slice(7));
  else if (u.startsWith('/dl/')) f = path.join(dl, u.slice(4));
  else if (u.startsWith('/out/')) f = path.join(out, u.slice(5));
  else if (u.startsWith('/game/')) f = path.join(root, '..', 'game', u.slice(6));
  else f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end('nf'); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); res.end(d); });
}).listen(5199, '127.0.0.1', () => console.log('listening 5199'));
