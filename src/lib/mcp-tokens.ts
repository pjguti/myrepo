import type { AuthInfo } from "@modelcontextprotocol/server";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { seal, unseal } from "./crypto";
import { config } from "./config";

type Identity={clientId:string;scopes:string[]};
export async function issueAccess(payload:Identity,requested=3300){const expiresIn=Math.max(60,Math.min(requested,3300));return{token:await seal("mcp-access",payload,expiresIn),expiresIn};}
export function issueRefresh(payload:Identity){return seal("mcp-refresh",payload,90*24*3600);}
export function readRefresh(token:string){return unseal<Identity>(token,"mcp-refresh");}
export async function verifyAccessToken(token:string):Promise<AuthInfo>{try{const p=await unseal<Identity>(token,"mcp-access");return{token,clientId:p.clientId,scopes:p.scopes,expiresAt:p.exp,resource:new URL(config.mcpUrl)};}catch{throw new OAuthError(OAuthErrorCode.InvalidToken,"Invalid or expired access token");}}
