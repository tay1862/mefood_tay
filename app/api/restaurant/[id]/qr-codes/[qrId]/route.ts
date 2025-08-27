import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE - ลบ QR Code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; qrId: string } }
) {
  try {
    const { id, qrId: qrCodeId } = await params
    const restaurantId = parseInt(id)
    const qrId = parseInt(qrCodeId)

    // ตรวจสอบว่า QR Code มีอยู่จริงและเป็นของร้านนี้
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        id: qrId,
        table: {
          restaurantId: restaurantId
        }
      }
    })

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR Code not found' },
        { status: 404 }
      )
    }

    // ลบ QR Code
    await prisma.qRCode.delete({
      where: {
        id: qrId
      }
    })

    return NextResponse.json({ message: 'QR Code deleted successfully' })
  } catch (error) {
    console.error('Error deleting QR code:', error)
    return NextResponse.json(
      { error: 'Failed to delete QR code' },
      { status: 500 }
    )
  }
}

// PUT - อัปเดต QR Code (เช่น เปิด/ปิดการใช้งาน)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; qrId: string } }
) {
  try {
    const restaurantId = parseInt(params.id)
    const qrId = parseInt(params.qrId)
    const body = await request.json()
    const { isActive } = body

    // ตรวจสอบว่า QR Code มีอยู่จริงและเป็นของร้านนี้
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        id: qrId,
        table: {
          restaurantId: restaurantId
        }
      }
    })

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR Code not found' },
        { status: 404 }
      )
    }

    // อัปเดต QR Code
    const updatedQRCode = await prisma.qRCode.update({
      where: {
        id: qrId
      },
      data: {
        isActive: isActive !== undefined ? isActive : qrCode.isActive
      },
      include: {
        table: true
      }
    })

    const formattedQRCode = {
      id: updatedQRCode.id,
      tableId: updatedQRCode.tableId,
      table: {
        id: updatedQRCode.table.id,
        number: updatedQRCode.table.number,
        name: updatedQRCode.table.name,
        capacity: updatedQRCode.table.capacity,
        status: updatedQRCode.table.status
      },
      qrCodeUrl: updatedQRCode.qrCodeUrl,
      isActive: updatedQRCode.isActive,
      createdAt: updatedQRCode.createdAt.toISOString(),
      lastUsed: updatedQRCode.lastUsed?.toISOString()
    }

    return NextResponse.json(formattedQRCode)
  } catch (error) {
    console.error('Error updating QR code:', error)
    return NextResponse.json(
      { error: 'Failed to update QR code' },
      { status: 500 }
    )
  }
}

