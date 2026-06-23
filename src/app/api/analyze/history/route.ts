import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ResultadoAplicacion } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const nivel = searchParams.get("nivel") ?? undefined;
  const resultado = searchParams.get("resultado") ?? undefined;

  const where = {
    tenantId: session.user.companyId,
    ...(nivel ? { nivel } : {}),
    ...(resultado ? { resultado: resultado as ResultadoAplicacion } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.analisisHistorico.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.analisisHistorico.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
