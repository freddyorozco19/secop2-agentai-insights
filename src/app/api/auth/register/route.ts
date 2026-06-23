import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

interface RegisterBody {
  companyName: string;
  nit?: string;
  sector?: string;
  name: string;
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const { companyName, nit, sector, name, email, password } = body;

  if (!companyName?.trim() || !name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: "companyName, name, email y password son obligatorios." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const company = await prisma.company.create({
    data: {
      nombre: companyName.trim(),
      nit: nit?.trim() || null,
      sector: sector?.trim() || null,
      users: {
        create: {
          email: normalizedEmail,
          passwordHash,
          name: name.trim(),
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  return NextResponse.json(
    {
      companyId: company.id,
      userId: company.users[0].id,
    },
    { status: 201 },
  );
}
