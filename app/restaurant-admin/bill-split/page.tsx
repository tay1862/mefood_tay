'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material'
import {
  Receipt,
  Add,
  Payment,
  Person,
  Restaurant,
  AttachMoney,
  CallSplit,
  Close,
  Check,
  QrCode,
  TableRestaurant
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { useTranslation } from 'react-i18next'

interface QRSession {
  id: string
  customerName?: string
  guestCount: number
  table: {
    id: string
    number: string
    name?: string
  }
  orders: Array<{
    id: string
    orderNumber: string
    totalAmount: number
    items: Array<{
      id: string
      quantity: number
      price: number
      menuItem: {
        id: string
        name: string
        price: number
      }
    }>
  }>
}

interface BillSplit {
  id: string
  totalAmount: number
  paidAmount: number
  status: string
  createdAt: string
  qrSession: QRSession
}

interface SplitItem {
  id: string
  name: string
  quantity: number
  price: number
  totalPrice: number
  assigned?: boolean
}

export default function BillSplitPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const theme = useTheme()
  const { t } = useTranslation()

  const [qrSessions, setQrSessions] = useState<QRSession[]>([])
  const [billSplits, setBillSplits] = useState<BillSplit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Dialog states
  const [splitDialog, setSplitDialog] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<QRSession | null>(null)
  const [selectedBillSplit, setSelectedBillSplit] = useState<BillSplit | null>(null)
  
  // Split configuration
  const [splitType, setSplitType] = useState<'equal_split' | 'by_person' | 'by_item'>('equal_split')
  const [numberOfPeople, setNumberOfPeople] = useState(2)
  const [personSplits, setPersonSplits] = useState<Array<{ name: string; amount: number }>>([])
  const [itemAssignments, setItemAssignments] = useState<{ [itemId: string]: number }>({})
  
  // Payment states
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch active QR sessions with orders
      const sessionsResponse = await fetch('/api/admin/qr-sessions')
      if (!sessionsResponse.ok) throw new Error('Failed to fetch QR sessions')
      const sessionsData = await sessionsResponse.json()
      
      // Filter sessions with orders
      const activeSessions = sessionsData.filter((session: QRSession) => 
        session.orders && session.orders.length > 0
      )
      setQrSessions(activeSessions)
      
      // Fetch existing bill splits
      const splitsResponse = await fetch(`/api/restaurant/${session?.user?.id}/bill-split`)
      if (splitsResponse.ok) {
        const splitsData = await splitsResponse.json()
        setBillSplits(splitsData.billSplits || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSplit = async () => {
    if (!selectedSession) return

    try {
      setError(null)
      setSuccess(null)

      const totalAmount = selectedSession.orders.reduce((sum, order) => sum + order.totalAmount, 0)
      let splits: Array<{ amount: number; details?: any }> = []

      switch (splitType) {
        case 'equal_split':
          const equalAmount = totalAmount / numberOfPeople
          splits = Array(numberOfPeople).fill(null).map((_, index) => ({
            amount: equalAmount,
            details: { person: `Person ${index + 1}`, type: 'equal' }
          }))
          break

        case 'by_person':
          splits = personSplits.map(person => ({
            amount: person.amount,
            details: { person: person.name, type: 'custom' }
          }))
          break

        case 'by_item':
          const allItems = selectedSession.orders.flatMap(order => order.items)
          const assignments: { [personIndex: number]: SplitItem[] } = {}
          
          allItems.forEach(item => {
            const assignedPerson = itemAssignments[item.id] || 0
            if (!assignments[assignedPerson]) assignments[assignedPerson] = []
            assignments[assignedPerson].push({
              id: item.id,
              name: item.menuItem.name,
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.price * item.quantity
            })
          })

          splits = Object.entries(assignments).map(([personIndex, items]) => ({
            amount: items.reduce((sum, item) => sum + item.totalPrice, 0),
            details: { 
              person: `Person ${parseInt(personIndex) + 1}`, 
              type: 'by_item',
              items: items
            }
          }))
          break
      }

      const response = await fetch(`/api/restaurant/${session?.user?.id}/bill-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qrSessionId: selectedSession.id,
          splitType,
          splits
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create bill split')
      }

      const result = await response.json()
      setSuccess('Bill split created successfully')
      setSplitDialog(false)
      setSelectedSession(null)
      
      // Refresh data
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bill split')
    }
  }

  const handlePayment = async () => {
    if (!selectedBillSplit || !paymentAmount) return

    try {
      setError(null)
      setSuccess(null)

      const response = await fetch(
        `/api/restaurant/${session?.user?.id}/bill-split/${selectedBillSplit.id}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentAmount: parseFloat(paymentAmount),
            paymentMethod,
            notes: paymentNotes
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process payment')
      }

      const result = await response.json()
      setSuccess('Payment processed successfully')
      setPaymentDialog(false)
      setSelectedBillSplit(null)
      setPaymentAmount('')
      setPaymentNotes('')
      
      // Refresh data
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment')
    }
  }

  const initializeSplit = (session: QRSession) => {
    setSelectedSession(session)
    setSplitType('equal_split')
    setNumberOfPeople(session.guestCount || 2)
    
    const totalAmount = session.orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const equalAmount = totalAmount / (session.guestCount || 2)
    
    setPersonSplits(
      Array(session.guestCount || 2).fill(null).map((_, index) => ({
        name: `Person ${index + 1}`,
        amount: equalAmount
      }))
    )
    
    // Initialize item assignments
    const allItems = session.orders.flatMap(order => order.items)
    const assignments: { [itemId: string]: number } = {}
    allItems.forEach((item, index) => {
      assignments[item.id] = index % (session.guestCount || 2)
    })
    setItemAssignments(assignments)
    
    setSplitDialog(true)
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant-admin',
          label: 'กลับไปหน้าแอดมิน'
        }}
      />

      <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Header */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 2, 
                backgroundColor: `${theme.palette.primary.main}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CallSplit sx={{ color: theme.palette.primary.main, fontSize: '2rem' }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  ระบบแยกบิล
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  จัดการการแยกบิลสำหรับลูกค้าแบบต่างๆ
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Active QR Sessions */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCode /> QR Sessions ที่มีออเดอร์
                </Typography>
                
                {qrSessions.length > 0 ? (
                  <Stack spacing={2}>
                    {qrSessions.map((session) => {
                      const totalAmount = session.orders.reduce((sum, order) => sum + order.totalAmount, 0)
                      const itemCount = session.orders.reduce((sum, order) => sum + order.items.length, 0)
                      
                      return (
                        <Paper key={session.id} sx={{ p: 2, border: 1, borderColor: 'grey.200' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                โต๊ะ {session.table.number}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ลูกค้า: {session.customerName || 'ไม่ระบุ'} | จำนวน: {session.guestCount} คน
                              </Typography>
                            </Box>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<CallSplit />}
                              onClick={() => initializeSplit(session)}
                            >
                              แยกบิล
                            </Button>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Chip 
                              label={`${session.orders.length} ออเดอร์`}
                              size="small"
                              color="primary"
                            />
                            <Chip 
                              label={`${itemCount} รายการ`}
                              size="small"
                              color="secondary"
                            />
                            <Chip 
                              label={`฿${totalAmount.toFixed(2)}`}
                              size="small"
                              color="success"
                            />
                          </Box>
                        </Paper>
                      )
                    })}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      ไม่มี QR Session ที่มีออเดอร์
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Existing Bill Splits */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Receipt /> บิลที่แยกแล้ว
                </Typography>
                
                {billSplits.length > 0 ? (
                  <Stack spacing={2}>
                    {billSplits.map((split) => (
                      <Paper key={split.id} sx={{ p: 2, border: 1, borderColor: 'grey.200' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              โต๊ะ {split.qrSession.table.number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(split.createdAt).toLocaleString('th-TH')}
                            </Typography>
                          </Box>
                          <Chip 
                            label={split.status === 'PAID' ? 'ชำระแล้ว' : split.status === 'PARTIAL_PAID' ? 'ชำระบางส่วน' : 'รอชำระ'}
                            color={split.status === 'PAID' ? 'success' : split.status === 'PARTIAL_PAID' ? 'warning' : 'error'}
                            size="small"
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2">
                              ยอดรวม: ฿{split.totalAmount.toFixed(2)}
                            </Typography>
                            <Typography variant="body2">
                              ชำระแล้ว: ฿{split.paidAmount.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="error">
                              คงเหลือ: ฿{(split.totalAmount - split.paidAmount).toFixed(2)}
                            </Typography>
                          </Box>
                          
                          {split.status !== 'PAID' && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Payment />}
                              onClick={() => {
                                setSelectedBillSplit(split)
                                setPaymentAmount((split.totalAmount - split.paidAmount).toString())
                                setPaymentDialog(true)
                              }}
                            >
                              ชำระเงิน
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      ยังไม่มีบิลที่แยก
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Split Bill Dialog */}
        <Dialog open={splitDialog} onClose={() => setSplitDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            แยกบิลสำหรับโต๊ะ {selectedSession?.table.number}
          </DialogTitle>
          <DialogContent>
            {selectedSession && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  ยอดรวมทั้งหมด: ฿{selectedSession.orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>วิธีการแยกบิล</InputLabel>
                  <Select
                    value={splitType}
                    label="วิธีการแยกบิล"
                    onChange={(e) => setSplitType(e.target.value as any)}
                  >
                    <MenuItem value="equal_split">แบ่งเท่าๆ กัน</MenuItem>
                    <MenuItem value="by_person">กำหนดจำนวนเอง</MenuItem>
                    <MenuItem value="by_item">แยกตามรายการ</MenuItem>
                  </Select>
                </FormControl>
                
                {splitType === 'equal_split' && (
                  <TextField
                    label="จำนวนคน"
                    type="number"
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 2)}
                    fullWidth
                    inputProps={{ min: 2, max: 10 }}
                  />
                )}
                
                {splitType === 'by_person' && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>กำหนดจำนวนเงินแต่ละคน</Typography>
                    {personSplits.map((person, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <TextField
                          label={`ชื่อคนที่ ${index + 1}`}
                          value={person.name}
                          onChange={(e) => {
                            const newSplits = [...personSplits]
                            newSplits[index].name = e.target.value
                            setPersonSplits(newSplits)
                          }}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="จำนวนเงิน"
                          type="number"
                          value={person.amount}
                          onChange={(e) => {
                            const newSplits = [...personSplits]
                            newSplits[index].amount = parseFloat(e.target.value) || 0
                            setPersonSplits(newSplits)
                          }}
                          sx={{ flex: 1 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
                
                {splitType === 'by_item' && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>กำหนดรายการให้แต่ละคน</Typography>
                    {selectedSession.orders.flatMap(order => order.items).map((item) => (
                      <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box>
                          <Typography variant="body1">{item.menuItem.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            จำนวน: {item.quantity} | ราคา: ฿{(item.price * item.quantity).toFixed(2)}
                          </Typography>
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>คนที่</InputLabel>
                          <Select
                            value={itemAssignments[item.id] || 0}
                            label="คนที่"
                            onChange={(e) => {
                              setItemAssignments({
                                ...itemAssignments,
                                [item.id]: e.target.value as number
                              })
                            }}
                          >
                            {Array(numberOfPeople).fill(null).map((_, index) => (
                              <MenuItem key={index} value={index}>
                                คนที่ {index + 1}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSplitDialog(false)}>ยกเลิก</Button>
            <Button onClick={handleCreateSplit} variant="contained">
              สร้างการแยกบิล
            </Button>
          </DialogActions>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            ชำระเงิน - โต๊ะ {selectedBillSplit?.qrSession.table.number}
          </DialogTitle>
          <DialogContent>
            {selectedBillSplit && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  ยอดรวม: ฿{selectedBillSplit.totalAmount.toFixed(2)}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  ชำระแล้ว: ฿{selectedBillSplit.paidAmount.toFixed(2)}
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color: 'error.main' }}>
                  คงเหลือ: ฿{(selectedBillSplit.totalAmount - selectedBillSplit.paidAmount).toFixed(2)}
                </Typography>
                
                <TextField
                  label="จำนวนเงินที่ชำระ"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>วิธีการชำระเงิน</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="วิธีการชำระเงิน"
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <MenuItem value="CASH">เงินสด</MenuItem>
                    <MenuItem value="CREDIT_CARD">บัตรเครดิต</MenuItem>
                    <MenuItem value="MOBILE_PAYMENT">Mobile Payment</MenuItem>
                    <MenuItem value="BANK_TRANSFER">โอนเงิน</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="หมายเหตุ"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialog(false)}>ยกเลิก</Button>
            <Button 
              onClick={handlePayment} 
              variant="contained"
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              ชำระเงิน
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}

