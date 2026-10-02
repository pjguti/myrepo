import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { bridgeCall } from "./apps-script-api";
import { config } from "./config";

const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true} as const;
const writeSafe={readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true} as const;
function ok(data:unknown){return{content:[{type:"text" as const,text:JSON.stringify(data)}],structuredContent:data as any};}
function fail(error:unknown){return{content:[{type:"text" as const,text:error instanceof Error?error.message:String(error)}],isError:true};}
const Link=z.object({url:z.string().url(),title:z.string().optional()});
function assertCourseId(courseId:string){
  if(courseId!==config.allowedCourseId) throw new Error("course_not_allowed");
}

export function buildServer(){
  const server=new McpServer({name:"google-classroom-pablo",version:"0.2.0"});
  server.registerTool("classroom_list_courses",{title:"List courses",description:"Lists active Google Classroom courses for the configured teacher.",inputSchema:z.object({}),annotations:readOnly},async()=>{try{return ok(await bridgeCall("list_courses",{}))}catch(e){return fail(e)}});
  server.registerTool("classroom_list_topics",{title:"List topics",description:"Lists topics in one allowed course.",inputSchema:z.object({courseId:z.string()}),annotations:readOnly},async({courseId})=>{try{assertCourseId(courseId);return ok(await bridgeCall("list_topics",{courseId}))}catch(e){return fail(e)}});
  server.registerTool("classroom_create_topic",{title:"Create topic",description:"Creates a topic in the allowed course.",inputSchema:z.object({courseId:z.string(),name:z.string().min(1).max(200)}),annotations:writeSafe},async({courseId,name})=>{try{assertCourseId(courseId);return ok(await bridgeCall("create_topic",{courseId,name}))}catch(e){return fail(e)}});
  server.registerTool("classroom_list_coursework",{title:"List coursework",description:"Lists coursework in one allowed course.",inputSchema:z.object({courseId:z.string()}),annotations:readOnly},async({courseId})=>{try{assertCourseId(courseId);return ok(await bridgeCall("list_coursework",{courseId}))}catch(e){return fail(e)}});
  server.registerTool("classroom_create_assignment",{title:"Create assignment",description:"Creates an assignment; DRAFT by default.",inputSchema:z.object({courseId:z.string(),title:z.string().min(1).max(300),description:z.string().optional(),topicId:z.string().optional(),state:z.enum(["DRAFT","PUBLISHED"]).default("DRAFT"),maxPoints:z.number().min(0).max(1000).optional(),dueDate:z.object({year:z.number().int(),month:z.number().int().min(1).max(12),day:z.number().int().min(1).max(31)}).optional(),dueTime:z.object({hours:z.number().int().min(0).max(23),minutes:z.number().int().min(0).max(59)}).optional(),scheduledTime:z.string().optional(),links:z.array(Link).max(20).optional()}),annotations:writeSafe},async(input)=>{try{assertCourseId(input.courseId);return ok(await bridgeCall("create_assignment",input))}catch(e){return fail(e)}});
  server.registerTool("classroom_create_material",{title:"Create material",description:"Creates a class material; DRAFT by default.",inputSchema:z.object({courseId:z.string(),title:z.string().min(1).max(300),description:z.string().optional(),topicId:z.string().optional(),state:z.enum(["DRAFT","PUBLISHED"]).default("DRAFT"),scheduledTime:z.string().optional(),links:z.array(Link).max(20).optional()}),annotations:writeSafe},async(input)=>{try{assertCourseId(input.courseId);return ok(await bridgeCall("create_material",input))}catch(e){return fail(e)}});
  server.registerTool("classroom_create_announcement",{title:"Create announcement",description:"Creates an announcement; DRAFT by default.",inputSchema:z.object({courseId:z.string(),text:z.string().min(1).max(10000),state:z.enum(["DRAFT","PUBLISHED"]).default("DRAFT"),scheduledTime:z.string().optional(),links:z.array(Link).max(20).optional()}),annotations:writeSafe},async(input)=>{try{assertCourseId(input.courseId);return ok(await bridgeCall("create_announcement",input))}catch(e){return fail(e)}});
  server.registerTool("classroom_list_submissions",{title:"List submissions",description:"Lists student submissions in one allowed course.",inputSchema:z.object({courseId:z.string()}),annotations:readOnly},async({courseId})=>{try{assertCourseId(courseId);return ok(await bridgeCall("list_submissions",{courseId}))}catch(e){return fail(e)}});
  return server;
}
