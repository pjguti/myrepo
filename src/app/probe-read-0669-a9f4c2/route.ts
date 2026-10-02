import { NextResponse } from "next/server";
import { bridgeCall } from "@/lib/apps-script-api";
import { config } from "@/lib/config";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const topics=await bridgeCall("list_topics",{courseId:config.allowedCourseId});
    const coursework=await bridgeCall("list_coursework",{courseId:config.allowedCourseId});
    return NextResponse.json({ok:true,courseId:config.allowedCourseId,topics,coursework});
  }catch(e){
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500});
  }
}
