import { config } from "@/lib/config";
import { unseal,seal,timingSafeEqualString } from "@/lib/crypto";
type Req={clientId:string;redirectUri:string;challenge:string;state?:string|null;resource:string;scopes:string[]};
export async function POST(request:Request){
  try{
    const f=await request.formData(); const ticket=String(f.get("ticket")??""),password=String(f.get("password")??"");
    if(!ticket||!timingSafeEqualString(password,config.connectorPassword))return new Response("No autorizado",{status:403});
    const a=await unseal<Req>(ticket,"local-auth-request");
    const code=await seal("mcp-code",{clientId:a.clientId,redirectUri:a.redirectUri,challenge:a.challenge,scopes:a.scopes},300);
    const r=new URL(a.redirectUri); r.searchParams.set("code",code); if(a.state)r.searchParams.set("state",a.state); r.searchParams.set("iss",config.origin);
    return Response.redirect(r,302);
  }catch(e){return new Response(e instanceof Error?e.message:String(e),{status:400});}
}
