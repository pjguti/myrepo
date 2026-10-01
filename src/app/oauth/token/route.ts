import { NextResponse } from "next/server";
import { unseal,sha256base64url,timingSafeEqualString } from "@/lib/crypto";
import { issueAccess,issueRefresh,readRefresh } from "@/lib/mcp-tokens";

type AuthCode={clientId:string;redirectUri:string;challenge:string;scopes:string[]};
function response(body:Record<string,unknown>,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});}
export async function POST(request:Request){
  try{
    const f=await request.formData(); const grant=String(f.get("grant_type")??""),clientId=String(f.get("client_id")??"");
    if(grant==="authorization_code"){
      const code=String(f.get("code")??""),redirectUri=String(f.get("redirect_uri")??""),verifier=String(f.get("code_verifier")??"");
      if(!code||!redirectUri||!verifier||!clientId)return response({error:"invalid_request"},400);
      const a=await unseal<AuthCode>(code,"mcp-code");
      if(a.clientId!==clientId||a.redirectUri!==redirectUri)return response({error:"invalid_grant"},400);
      const computed=await sha256base64url(verifier);
      if(!timingSafeEqualString(computed,a.challenge))return response({error:"invalid_grant",error_description:"pkce_failed"},400);
      const ident={clientId:a.clientId,scopes:a.scopes};
      const access=await issueAccess(ident); const refresh=await issueRefresh(ident);
      return response({access_token:access.token,token_type:"Bearer",expires_in:access.expiresIn,refresh_token:refresh,scope:a.scopes.join(" ")});
    }
    if(grant==="refresh_token"){
      const token=String(f.get("refresh_token")??""); if(!token||!clientId)return response({error:"invalid_request"},400);
      const stored=await readRefresh(token); if(stored.clientId!==clientId)return response({error:"invalid_grant"},400);
      const ident={clientId:stored.clientId,scopes:stored.scopes}; const access=await issueAccess(ident); const refresh=await issueRefresh(ident);
      return response({access_token:access.token,token_type:"Bearer",expires_in:access.expiresIn,refresh_token:refresh,scope:stored.scopes.join(" ")});
    }
    return response({error:"unsupported_grant_type"},400);
  }catch(e){return response({error:"invalid_grant",error_description:e instanceof Error?e.message:String(e)},400);}
}
export function OPTIONS(){return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization"}});}
