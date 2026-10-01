function required(name:string){const v=process.env[name]?.trim();if(!v)throw new Error(`Missing environment variable: ${name}`);return v;}
function origin(){const raw=required("APP_ORIGIN").replace(/\/$/,"");const u=new URL(raw);const local=["localhost","127.0.0.1","[::1]"].includes(u.hostname);if(u.protocol!=="https:"&&!(local&&u.protocol==="http:"))throw new Error("APP_ORIGIN must use HTTPS outside localhost");return u.origin;}
export const config={
  get origin(){return origin()},
  get mcpUrl(){return `${this.origin}/mcp`},
  get authSecret(){const v=required("AUTH_SECRET");if(v.length<32)throw new Error("AUTH_SECRET must be at least 32 chars");return v},
  get connectorPassword(){return required("CONNECTOR_PASSWORD")},
  get appsScriptUrl(){return required("APPS_SCRIPT_URL")},
  get appsScriptSecret(){return required("APPS_SCRIPT_SHARED_SECRET")},
  get allowedCimdHosts(){return(process.env.ALLOWED_CIMD_HOSTS??"chatgpt.com").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)}
};
export const MCP_SCOPES=["mcp","offline_access"] as const;
