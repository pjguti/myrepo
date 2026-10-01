function required(name:string){const v=process.env[name]?.trim();if(!v)throw new Error(`Missing environment variable: ${name}`);return v;}
function origin(){const raw=required("APP_ORIGIN").replace(/\/$/,"");const u=new URL(raw);const local=["localhost","127.0.0.1","[::1]"].includes(u.hostname);if(u.protocol!=="https:"&&!(local&&u.protocol==="http:"))throw new Error("APP_ORIGIN must use HTTPS outside localhost");return u.origin;}
export const config={
  get origin(){return origin()},
  get mcpUrl(){return `${this.origin}/mcp`},
  get googleClientId(){return required("GOOGLE_CLIENT_ID")},
  get googleClientSecret(){return required("GOOGLE_CLIENT_SECRET")},
  get googleCallbackUrl(){return `${this.origin}/oauth/google/callback`},
  get authSecret(){const v=required("AUTH_SECRET");if(v.length<32)throw new Error("AUTH_SECRET must be at least 32 chars");return v},
  get allowedEmails(){return(process.env.ALLOWED_GOOGLE_EMAILS??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)},
  get allowedCourseIds(){return(process.env.ALLOWED_COURSE_IDS??"").split(",").map(x=>x.trim()).filter(Boolean)},
  get allowedCimdHosts(){return(process.env.ALLOWED_CIMD_HOSTS??"chatgpt.com").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)}
};
export const GOOGLE_SCOPES=[
  "openid","email","profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.topics",
  "https://www.googleapis.com/auth/classroom.coursework.students",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials",
  "https://www.googleapis.com/auth/classroom.announcements",
  "https://www.googleapis.com/auth/classroom.student-submissions.students.readonly"
] as const;
export const MCP_SCOPES=["mcp","offline_access"] as const;
