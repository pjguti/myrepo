import { config,MCP_SCOPES } from "@/lib/config";
import { seal } from "@/lib/crypto";
import { resolveClient } from "@/lib/oauth-client";

const PKCE=/^[A-Za-z0-9\-._~]{43,128}$/;

export async function GET(request:Request){
  try{
    const u=new URL(request.url);
    const clientId=u.searchParams.get("client_id"),redirectUri=u.searchParams.get("redirect_uri"),challenge=u.searchParams.get("code_challenge"),method=u.searchParams.get("code_challenge_method"),state=u.searchParams.get("state"),resource=u.searchParams.get("resource");
    if(u.searchParams.get("response_type")!=="code"||!clientId||!redirectUri)throw new Error("invalid_request");
    if(!challenge||method!=="S256"||!PKCE.test(challenge))throw new Error("pkce_s256_required");
    if(resource&&resource!==config.mcpUrl)throw new Error("invalid_resource");
    const client=await resolveClient(clientId);
    if(!client.redirectUris.includes(redirectUri))throw new Error("redirect_uri_not_registered");
    const scopes=(u.searchParams.get("scope")??"mcp offline_access").split(/\s+/).filter(x=>MCP_SCOPES.includes(x as any));
    if(!scopes.includes("mcp"))scopes.unshift("mcp");
    if(!scopes.includes("offline_access"))scopes.push("offline_access");
    const ticket=await seal("local-auth-request",{clientId,redirectUri,challenge,state,resource:resource??config.mcpUrl,scopes},600);
    return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Google Classroom MCP</title><body style="font-family:system-ui;max-width:520px;margin:60px auto"><h1>Google Classroom MCP · Pablo</h1><p>Introduce la contraseña privada del conector.</p><form method="post" action="/oauth/approve"><input type="hidden" name="ticket" value="${ticket}"><input name="password" type="password" autocomplete="current-password" style="width:100%;padding:10px;margin:8px 0" required><button type="submit" style="padding:10px 18px">Autorizar</button></form></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8"}});
  }catch(e){return Response.json({error:"invalid_request",error_description:e instanceof Error?e.message:String(e)},{status:400});}
}
