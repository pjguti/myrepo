import { createMcpHandler, hostHeaderValidationResponse } from "@modelcontextprotocol/server";
import { config } from "@/lib/config";
import { buildServer } from "@/lib/mcp-server";

export const dynamic="force-dynamic";

async function serve(request:Request):Promise<Response>{
  const expectedHost=new URL(config.origin).hostname;
  const rejected=hostHeaderValidationResponse(request,[expectedHost]);
  if(rejected) return rejected;

  const url=new URL(request.url);
  const key=url.searchParams.get("key")||"";
  if(key!==config.authSecret){
    return new Response("Unauthorized",{status:401,headers:{"WWW-Authenticate":"Bearer"}});
  }

  const handler=createMcpHandler(()=>buildServer());
  return handler.fetch(request);
}
export const GET=serve;
export const POST=serve;
export const DELETE=serve;
export const OPTIONS=serve;
