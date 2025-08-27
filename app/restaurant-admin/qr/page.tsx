'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Fab
} from '@mui/material'
import {
  QrCode,
  Download,
  Print,
  Visibility,
  Edit,
  Delete,
  Add,
  Refresh,
  TableRestaurant
} from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'

interface Table {
  id: number
  number: string
  name?: string
  capacity: number
  status: 'active' | 'inactive'
}

interface QRCodeData {
  id: number
  tableId: number
  table: Table
  qrCodeUrl: string
  isActive: boolean
  createdAt: string
  lastUsed?: string
}

export default function QRCodeManagementPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [qrDialogOpen, setQRDialogOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load tables
      const tablesRes = await fetch('/api/restaurant/1/tables')
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json()
        setTables(tablesData)
      }

      // Load existing QR codes
      const qrRes = await fetch('/api/restaurant/1/qr-codes')
      if (qrRes.ok) {
        const qrData = await qrRes.json()
        setQRCodes(qrData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (table: Table) => {
    setGenerating(true)
    try {
      const response = await fetch('/api/restaurant/1/qr-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id
        })
      })

      if (response.ok) {
        await loadData() // Reload data
        setGenerateDialogOpen(false)
      } else {
        alert('เกิดข้อผิดพลาดในการสร้าง QR Code')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('เกิดข้อผิดพลาดในการสร้าง QR Code')
    } finally {
      setGenerating(false)
    }
  }

  const deleteQRCode = async (qrId: number) => {
    if (!confirm('คุณต้องการลบ QR Code นี้หรือไม่?')) {
      return
    }

    try {
      const response = await fetch(`/api/restaurant/1/qr-codes/${qrId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData() // Reload data
      } else {
        alert('เกิดข้อผิดพลาดในการลบ QR Code')
      }
    } catch (error) {
      console.error('Error deleting QR code:', error)
      alert('เกิดข้อผิดพลาดในการลบ QR Code')
    }
  }

  const downloadQRCode = (qrData: QRCodeData) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 300
    canvas.height = 350

    // White background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Create QR code
    const qrCodeElement = document.createElement('div')
    qrCodeElement.innerHTML = `<svg width="250" height="250">${document.querySelector(`#qr-${qrData.id} svg`)?.innerHTML}</svg>`
    
    const img = new Image()
    const svgData = new XMLSerializer().serializeToString(qrCodeElement.querySelector('svg')!)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      // Draw QR code
      ctx.drawImage(img, 25, 25, 250, 250)
      
      // Add text
      ctx.fillStyle = 'black'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`โต๊ะ ${qrData.table.number}`, canvas.width / 2, 300)
      if (qrData.table.name) {
        ctx.font = '14px Arial'
        ctx.fillText(qrData.table.name, canvas.width / 2, 320)
      }
      ctx.fillText('สแกนเพื่อสั่งอาหาร', canvas.width / 2, 340)

      // Download
      const link = document.createElement('a')
      link.download = `qr-table-${qrData.table.number}.png`
      link.href = canvas.toDataURL()
      link.click()

      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const printQRCode = (qrData: QRCodeData) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrSvg = document.querySelector(`#qr-${qrData.id} svg`)?.outerHTML
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - โต๊ะ ${qrData.table.number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              border: 2px solid #333;
              padding: 20px;
              margin: 20px auto;
              width: 300px;
              background: white;
            }
            .qr-code {
              margin: 20px 0;
            }
            .table-info {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            .instruction {
              font-size: 14px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .qr-container { 
                border: 2px solid #333;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">${qrSvg}</div>
            <div class="table-info">โต๊ะ ${qrData.table.number}</div>
            ${qrData.table.name ? `<div class="table-info">${qrData.table.name}</div>` : ''}
            <div class="instruction">สแกนเพื่อสั่งอาหาร</div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const getQRCodeUrl = (table: Table) => {
    return `${window.location.origin}/restaurant/1/table/${table.id}`
  }

  const tablesWithoutQR = tables.filter(table => 
    !qrCodes.some(qr => qr.tableId === table.id && qr.isActive)
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <QrCode sx={{ mr: 2, verticalAlign: 'middle' }} />
            จัดการ QR Code
          </Typography>
          <Typography variant="body1" color="text.secondary">
            สร้างและจัดการ QR Code สำหรับโต๊ะต่างๆ
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            sx={{ mr: 2 }}
          >
            รีเฟรช
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setGenerateDialogOpen(true)}
            disabled={tablesWithoutQR.length === 0}
          >
            สร้าง QR Code
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                QR Code ทั้งหมด
              </Typography>
              <Typography variant="h4">
                {qrCodes.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                QR Code ที่ใช้งานได้
              </Typography>
              <Typography variant="h4" color="success.main">
                {qrCodes.filter(qr => qr.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                โต๊ะทั้งหมด
              </Typography>
              <Typography variant="h4">
                {tables.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                โต๊ะที่ยังไม่มี QR
              </Typography>
              <Typography variant="h4" color="warning.main">
                {tablesWithoutQR.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Codes Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            QR Code ทั้งหมด
          </Typography>
          
          {qrCodes.length === 0 ? (
            <Box textAlign="center" py={4}>
              <QrCode sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                ยังไม่มี QR Code
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                เริ่มต้นด้วยการสร้าง QR Code สำหรับโต๊ะของคุณ
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setGenerateDialogOpen(true)}
                disabled={tables.length === 0}
              >
                สร้าง QR Code แรก
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>QR Code</TableCell>
                    <TableCell>โต๊ะ</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>สร้างเมื่อ</TableCell>
                    <TableCell>ใช้ล่าสุด</TableCell>
                    <TableCell align="center">การจัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qrCodes.map((qrData) => (
                    <TableRow key={qrData.id}>
                      <TableCell>
                        <Box id={`qr-${qrData.id}`} sx={{ width: 60, height: 60 }}>
                          <QRCodeSVG
                            value={getQRCodeUrl(qrData.table)}
                            size={60}
                            level="M"
                            includeMargin={false}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TableRestaurant />
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              โต๊ะ {qrData.table.number}
                            </Typography>
                            {qrData.table.name && (
                              <Typography variant="caption" color="text.secondary">
                                {qrData.table.name}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={qrData.isActive ? 'ใช้งานได้' : 'ไม่ใช้งาน'}
                          color={qrData.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(qrData.createdAt).toLocaleDateString('th-TH')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {qrData.lastUsed 
                            ? new Date(qrData.lastUsed).toLocaleDateString('th-TH')
                            : 'ยังไม่เคยใช้'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedQR(qrData)
                              setQRDialogOpen(true)
                            }}
                            title="ดู QR Code"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => downloadQRCode(qrData)}
                            title="ดาวน์โหลด"
                          >
                            <Download />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => printQRCode(qrData)}
                            title="พิมพ์"
                          >
                            <Print />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deleteQRCode(qrData.id)}
                            title="ลบ"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Generate QR Code Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>สร้าง QR Code ใหม่</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            เลือกโต๊ะที่ต้องการสร้าง QR Code
          </Typography>
          
          {tablesWithoutQR.length === 0 ? (
            <Alert severity="info">
              โต๊ะทั้งหมดมี QR Code แล้ว
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {tablesWithoutQR.map((table) => (
                <Grid item xs={12} sm={6} key={table.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedTable?.id === table.id ? 2 : 1,
                      borderColor: selectedTable?.id === table.id ? 'primary.main' : 'divider'
                    }}
                    onClick={() => setSelectedTable(table)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <TableRestaurant />
                        <Typography variant="h6">
                          โต๊ะ {table.number}
                        </Typography>
                      </Box>
                      {table.name && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {table.name}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {table.capacity} ที่นั่ง
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={() => selectedTable && generateQRCode(selectedTable)}
            disabled={!selectedTable || generating}
          >
            {generating ? <CircularProgress size={20} /> : 'สร้าง QR Code'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Preview Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQRDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          QR Code - โต๊ะ {selectedQR?.table.number}
        </DialogTitle>
        <DialogContent>
          {selectedQR && (
            <Box textAlign="center">
              <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, mb: 3 }}>
                <QRCodeSVG
                  value={getQRCodeUrl(selectedQR.table)}
                  size={250}
                  level="M"
                  includeMargin={true}
                />
              </Box>
              <Typography variant="h6" gutterBottom>
                โต๊ะ {selectedQR.table.number}
              </Typography>
              {selectedQR.table.name && (
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {selectedQR.table.name}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                สแกนเพื่อสั่งอาหาร
              </Typography>
              
              <Box mt={3} display="flex" gap={2} justifyContent="center">
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => selectedQR && downloadQRCode(selectedQR)}
                >
                  ดาวน์โหลด
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => selectedQR && printQRCode(selectedQR)}
                >
                  พิมพ์
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQRDialogOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

