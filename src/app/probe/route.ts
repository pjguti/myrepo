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
  if (!["health","list_courses"].includes(action)) {
    return NextResponse.json({ok:false,error:"action_not_allowed"},{status:400});
  }
  try {
    const result = await bridgeCall(action,{});
    return NextResponse.json({ok:true,result});
  } catch (e) {
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:String(e)},{status:500});
  }
}
