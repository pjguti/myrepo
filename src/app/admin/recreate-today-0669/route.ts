import { NextResponse } from "next/server";
import { bridgeCall } from "@/lib/apps-script-api";
import { config } from "@/lib/config";
export const dynamic="force-dynamic";
const ASSIGNMENTS=["869992625371","888683370951","888686013704","888685779233","888686382722","869992270871","869992596915","888685696424","888684470300","888684468631","888686068110","869992744131","888684186396","869992558623","888685831906","888685785876","869992695496","869992736776","888683376374","869992674397","869992723874","869992604604","869992716068","888685758661","888684260922","869992630046","888685385395","888685326506","888684535246","888683175571","888685013162","888685423825"];
const MATERIALS=["869992536394","888683692616"];
export async function POST(request:Request){
  const u=new URL(request.url);
  if((u.searchParams.get("token")||"")!==(process.env.PROBE_TOKEN||"")) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const results:any[]=[];
  for(const id of ASSIGNMENTS){
    try{const r=await bridgeCall("delete_coursework",{courseId:config.allowedCourseId,id});results.push({id,kind:"assignment",ok:true,result:r});}
    catch(e){results.push({id,kind:"assignment",ok:false,error:e instanceof Error?e.message:String(e)});}
  }
  for(const id of MATERIALS){
    try{const r=await bridgeCall("delete_material",{courseId:config.allowedCourseId,id});results.push({id,kind:"material",ok:true,result:r});}
    catch(e){results.push({id,kind:"material",ok:false,error:e instanceof Error?e.message:String(e)});}
  }
  const failed=results.filter(x=>!x.ok);
  return NextResponse.json({ok:failed.length===0,total:results.length,failed,results},{status:failed.length?500:200});
}
