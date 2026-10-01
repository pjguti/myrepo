import { buildOAuthProtectedResourceMetadata, type OAuthMetadata } from "@modelcontextprotocol/server";
import { config, MCP_SCOPES } from "./config";

export function getOAuthMetadata(): OAuthMetadata {
  const origin = config.origin;
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code","refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...MCP_SCOPES],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true
  };
}

export function getProtectedResourceMetadata() {
  const oauthMetadata = getOAuthMetadata();
  return buildOAuthProtectedResourceMetadata({
    oauthMetadata,
    resourceServerUrl: new URL(config.mcpUrl),
    scopesSupported: ["mcp"],
    resourceName: "Google Classroom MCP · Pablo"
  });
}
