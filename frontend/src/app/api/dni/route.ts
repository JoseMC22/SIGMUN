import { NextResponse } from "next/server";

const APIS_TOKEN = process.env.APIS_NET_TOKEN ?? "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numero = searchParams.get("numero");

  if (!numero) {
    return NextResponse.json(
      { error: "El parámetro 'numero' es obligatorio." },
      { status: 400 },
    );
  }

  if (!APIS_TOKEN) {
    return NextResponse.json(
      { error: "Token de API no configurado. Defina APIS_NET_TOKEN en .env.local" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://api.apis.net.pe/v1/dni?numero=${encodeURIComponent(numero)}`,
      {
        headers: {
          Authorization: `Bearer ${APIS_TOKEN}`,
          Referer: "https://apis.net.pe/consulta-dni-api",
        },
      },
    );

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/dni]", error);
    return NextResponse.json(
      { error: "Error al consultar el servicio externo." },
      { status: 502 },
    );
  }
}
