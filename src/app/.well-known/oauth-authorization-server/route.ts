import { NextResponse } from "next/server";
import { getOAuthMetadata } from "@/lib/oauth-metadata";
export const dynamic = "force-dynamic";
export function GET(){ return NextResponse.json(getOAuthMetadata()); }
