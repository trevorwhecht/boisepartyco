import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { firstName, lastName, email, phone, companyName, consentSms, consentEmail, password, address } = body

  const updateData: Record<string, any> = {}
  if (firstName !== undefined) updateData.firstName = firstName
  if (lastName !== undefined) updateData.lastName = lastName
  if (email !== undefined) updateData.email = email
  if (phone !== undefined) updateData.phone = phone || null
  if (companyName !== undefined) updateData.companyName = companyName || null
  if (consentSms !== undefined) updateData.consentSms = consentSms
  if (consentEmail !== undefined) updateData.consentEmail = consentEmail

  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ data: null, error: "Password must be at least 8 characters" }, { status: 400 })
    }
    updateData.password = await hash(password, 12)
  }

  try {
    // Ownership check before any writes — avoids partial profile save on 403
    let existingAddr = null
    if (address?.id) {
      existingAddr = await prisma.address.findFirst({
        where: { id: address.id, userId: session.user.id },
      })
      if (!existingAddr) {
        return NextResponse.json({ data: null, error: "Address not found" }, { status: 403 })
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        consentSms: true,
        consentEmail: true,
      },
    })

    if (address) {
      if (address.id) {
        await prisma.address.update({
          where: { id: address.id },
          data: {
            street: address.street,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
          },
        })
      } else {
        await prisma.address.create({
          data: {
            userId: session.user.id,
            street: address.street,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            label: "primary",
          },
        })
      }
    }

    return NextResponse.json({ data: user, error: null })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ data: null, error: "Email already in use" }, { status: 409 })
    }
    return NextResponse.json({ data: null, error: "Failed to update profile" }, { status: 500 })
  }
}
