import { NextResponse } from "next/server";
import { bridgeCall } from "@/lib/apps-script-api";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const u = new URL(request.url);
  const token = u.searchParams.get("token") || "";
  if (token !== process.env.PROBE_TOKEN) {
    return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  }
  const action = u.searchParams.get("action") || "health";
  try {
    if(action==="health") {
      const result=await bridgeCall("health",{});
      return NextResponse.json({ok:true,result});
    }
    if(action==="list_courses") {
      const result=await bridgeCall("list_courses",{});
      return NextResponse.json({ok:true,result});
    }
    if(action==="list_topics") {
      const result=await bridgeCall("list_topics",{courseId:config.allowedCourseId});
      return NextResponse.json({ok:true,courseId:config.allowedCourseId,result});
    }
    if(action==="list_coursework") {
      const result=await bridgeCall("list_coursework",{courseId:config.allowedCourseId});
      return NextResponse.json({ok:true,courseId:config.allowedCourseId,result});
    }
    return NextResponse.json({ok:false,error:"action_not_allowed"},{status:400});
  } catch (e) {
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500});
  }
}
