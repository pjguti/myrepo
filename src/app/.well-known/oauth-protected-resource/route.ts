import { NextResponse } from "next/server";
import { getProtectedResourceMetadata } from "@/lib/oauth-metadata";
export const dynamic = "force-dynamic";
export function GET(){ return NextResponse.json(getProtectedResourceMetadata()); }
