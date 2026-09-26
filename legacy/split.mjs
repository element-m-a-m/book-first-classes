// Split an index.html into {pre, script, post} around the app <script> (the one after react-dom).
import fs from 'fs';
export function split(html){
  const anchor=html.indexOf('react-dom.production.min.js');
  const open=html.indexOf('<script',anchor+1); const gt=html.indexOf('>',open)+1;
  const close=html.indexOf('</script>',gt);
  return {pre:html.slice(0,gt),script:html.slice(gt,close),post:html.slice(close),tag:html.slice(open,gt)};
}
if(process.argv[2]){const s=split(fs.readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify({tag:s.tag,pre:s.pre.length,script:s.script.length,post:s.post.length,scriptHead:s.script.slice(0,60),scriptTail:JSON.stringify(s.script.slice(-40))}))}
