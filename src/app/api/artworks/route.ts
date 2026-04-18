import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listArtworks, getArtworkById } from "@/lib/supabase-db";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const artwork = await getArtworkById(id);
    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }
    return NextResponse.json(artwork);
  }

  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;
  const artworks = await listArtworks(limit);
  return NextResponse.json(artworks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await adminClient
      .from("artworks")
      .insert(body)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating artwork:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create artwork" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Artwork ID is required" }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("artworks")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating artwork:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update artwork" },
      { status: 500 }
    );
  }
}
