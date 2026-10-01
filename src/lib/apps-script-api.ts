import { config } from "./config";
export async function bridgeCall(action:string,payload:any){
  const r=await fetch(config.appsScriptUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:config.appsScriptSecret,action,payload}),cache:"no-store",redirect:"follow"});
  if(!r.ok)throw new Error(`apps_script_http:${r.status}:${await r.text()}`);
  const d=await r.json();
  if(!d.ok)throw new Error(d.error||"apps_script_error");
  return d.result;
}
