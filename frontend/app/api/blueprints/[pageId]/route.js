import { NextResponse } from "next/server";
import { loadBlueprintFromJson } from "@/lib/jsonBlueprintLoader";

export async function GET(request, { params }) {
  const pageId = params?.pageId;

  try {
    const result = await loadBlueprintFromJson(pageId);
    return NextResponse.json(result.blueprint, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-SDUI-Blueprint-Source": result.meta.fileName,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err.message,
        availableBlueprints: err.availableBlueprints || [],
      },
      { status: err.status || 500 }
    );
  }
}
