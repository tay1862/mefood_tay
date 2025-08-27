
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  Grid
} from '@mui/material'
import {
  QrCode,
  Download,
  Visibility,
  Print,
  Refresh,
  Close,
  MoveUp
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import MoveTableDialog from './MoveTableDialog';
import MergeTableDialog from './MergeTableDialog';

interface Table {
  id: string
  number: string
  name?: string
  capacity: number
  isActive: boolean
  qrCode?: string
  qrCodeActive: boolean
  createdAt: string
}

interface QRSession {
  id: string
  sessionToken: string
  customerName?: string
  guestCount: number
  isActive: boolean
  startedAt: string
  table: {
    id: string
    number: string
    name?: string
  }
  orders: any[]
  staffCalls: any[]
  musicRequests: any[]
}

export default function QRCodesManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  
  const [tables, setTables] = useState<Table[]>([])
  const [activeSessions, setActiveSessions] = useState<QRSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Dialog states
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false)
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null)
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>("")
  const [generatingQr, setGeneratingQr] = useState<string | null>(null)
  const [moveTableDialogOpen, setMoveTableDialogOpen] = useState(false);
  const [mergeTableDialogOpen, setMergeTableDialogOpen] = useState(false);
  const [selectedQrSession, setSelectedQrSession] = useState<QRSession | null>(null);

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tablesResponse, sessionsResponse] = await Promise.all([
        fetch('/api/restaurant/tables'),
        fetch('/api/admin/qr-sessions')
      ]);

      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json()
        setTables(tablesData)
      }

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        setActiveSessions(sessionsData)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (tableId: string) => {
    setGeneratingQr(tableId)
    setError(null)

    try {
      const response = await fetch(`/api/qr/generate/${tableId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate QR code')
      }

      const data = await response.json()
      
      setTables(tables.map(table => 
        table.id === tableId 
          ? { ...table, qrCode: data.qrCode }
          : table
      ))
      
      setSuccess('QR code generated successfully')

    } catch (error) {
      console.error('Error generating QR code:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate QR code')
    } finally {
      setGeneratingQr(null)
    }
  }

  const toggleQRCodeActive = async (tableId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/restaurant/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qrCodeActive: active
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update QR code status')
      }

      setTables(tables.map(table => 
        table.id === tableId 
          ? { ...table, qrCodeActive: active }
          : table
      ))

      setSuccess(`QR code ${active ? 'activated' : 'deactivated'} successfully`)

    } catch (error) {
      console.error('Error updating QR code status:', error)
      setError('Failed to update QR code status')
    }
  }

  const downloadQRCode = (qrCode: string, tableNumber: string) => {
    const link = document.createElement('a')
    link.href = qrCode
    link.download = `table-${tableNumber}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const printQRCode = (qrCode: string) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code</title>
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; }
              .qr-container { text-align: center; padding: 20px; }
              img { max-width: 300px; height: auto; }
              h2 { margin-top: 20px; color: #2E5E45; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrCode}" alt="QR Code" />
              <h2>Scan to Order</h2>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const previewQRCode = (qrCode: string, tableNumber: string) => {
    setSelectedQrCode(qrCode)
    setSelectedTableNumber(tableNumber)
    setQrPreviewOpen(true)
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading QR Management...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <RestaurantNavbar />
      <Container maxWidth="lg" sx={{ my: 4, flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom>
          {t('qrCodesManagement.title')}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Active QR Sessions */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Active QR Sessions</Typography>
              <Button size="small" variant="outlined" onClick={fetchData} startIcon={<Refresh />}>
                Refresh
              </Button>
            </Box>
            {activeSessions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center">No active QR sessions.</Typography>
            ) : (
              <Grid container spacing={2}>
                {activeSessions.map((session) => (
                  <Grid item xs={12} sm={6} md={4} key={session.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">Table {session.table.number}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {session.customerName || 'Anonymous'} - {session.guestCount} guests
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={`${session.orders.length} orders`} size="small" />
                          {session.staffCalls.length > 0 && (
                            <Chip label={`${session.staffCalls.length} calls`} size="small" color="warning" />
                          )}
                          {session.musicRequests.length > 0 && (
                            <Chip label={`${session.musicRequests.length} music`} size="small" color="info" />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button size="small" variant="outlined" onClick={() => { setSelectedQrSession(session); setMoveTableDialogOpen(true); }}>Move</Button>
                          <Button size="small" variant="outlined" onClick={() => { setSelectedQrSession(session); setMergeTableDialogOpen(true); }}>Merge</Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Table Management */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Table Management</Typography>
            </Box>
            
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Table</strong></TableCell>
                    <TableCell><strong>Capacity</strong></TableCell>
                    <TableCell><strong>QR Status</strong></TableCell>
                    <TableCell><strong>QR Code</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">Table {table.number}</Typography>
                          {table.name && <Typography variant="caption" color="text.secondary">{table.name}</Typography>}
                        </Box>
                      </TableCell>
                      <TableCell>{table.capacity} guests</TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={<Switch checked={table.qrCodeActive} onChange={(e) => toggleQRCodeActive(table.id, e.target.checked)} disabled={!table.qrCode} />}
                          label={table.qrCodeActive ? 'Active' : 'Inactive'}
                        />
                      </TableCell>
                      <TableCell>
                        {table.qrCode ? <Chip label="Generated" color="success" size="small" /> : <Chip label="Not Generated" color="default" size="small" />}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {table.qrCode ? (
                            <>
                              <IconButton size="small" onClick={() => previewQRCode(table.qrCode!, table.number)} color="primary"><Visibility /></IconButton>
                              <IconButton size="small" onClick={() => downloadQRCode(table.qrCode!, table.number)} color="primary"><Download /></IconButton>
                              <IconButton size="small" onClick={() => printQRCode(table.qrCode!)} color="primary"><Print /></IconButton>
                              <IconButton size="small" onClick={() => generateQRCode(table.id)} disabled={generatingQr === table.id}><Refresh /></IconButton>
                            </>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => generateQRCode(table.id)}
                              disabled={generatingQr === table.id}
                              startIcon={generatingQr === table.id ? <CircularProgress size={16} /> : <QrCode />}
                            >
                              {generatingQr === table.id ? 'Generating...' : 'Generate'}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">No tables found. Add tables first to generate QR codes.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={qrPreviewOpen} onClose={() => setQrPreviewOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            QR Code - Table {selectedTableNumber}
            <IconButton onClick={() => setQrPreviewOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ textAlign: 'center', py: 3 }}>
            {selectedQrCode && (
              <Box>
                <Image src={selectedQrCode} alt="QR Code" width={300} height={300} style={{ border: '1px solid #ddd', borderRadius: 8 }} />
                <Typography variant="h6" sx={{ mt: 2, color: '#2E5E45' }}>Scan to Order</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Customers can scan this QR code to start ordering from Table {selectedTableNumber}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => selectedQrCode && downloadQRCode(selectedQrCode, selectedTableNumber)} startIcon={<Download />}>Download</Button>
            <Button onClick={() => selectedQrCode && printQRCode(selectedQrCode!)} startIcon={<Print />}>Print</Button>
          </DialogActions>
        </Dialog>

        {selectedQrSession && (
          <MoveTableDialog
            isOpen={moveTableDialogOpen}
            onClose={() => setMoveTableDialogOpen(false)}
            qrSessionId={selectedQrSession.id}
            currentTableNumber={selectedQrSession.table.number}
            tables={tables}
            onSuccess={() => { setMoveTableDialogOpen(false); fetchData(); }}
          />
        )}

        {selectedQrSession && (
          <MergeTableDialog
            isOpen={mergeTableDialogOpen}
            onClose={() => setMergeTableDialogOpen(false)}
            sourceSessionId={selectedQrSession.id}
            sourceTableNumber={selectedQrSession.table.number}
            activeSessions={activeSessions}
            onSuccess={() => { setMergeTableDialogOpen(false); fetchData(); }}
          />
        )}

      </Container>
      <Footer />
    </Box>
  )
}


