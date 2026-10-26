import { NextResponse } from "next/server";
import { listAvailableBlueprints } from "@/lib/jsonBlueprintLoader";

export async function GET() {
  try {
    const list = await listAvailableBlueprints();
    return NextResponse.json({
      count: list.length,
      blueprints: list,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
