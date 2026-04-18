import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listSales, getSaleById } from "@/lib/supabase-db";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const sale = await getSaleById(id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    return NextResponse.json(sale);
  }

  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;
  const sales = await listSales(limit);
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await adminClient
      .from("auction_sales")
      .insert(body)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sale" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("auction_sales")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update sale" },
      { status: 500 }
    );
  }
}
