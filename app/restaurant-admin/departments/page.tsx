'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
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
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Business,
  Store
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

interface Department {
  id: string
  name: string
  description?: string
  menuItemCount: number
  createdAt: string
  updatedAt: string
}

export default function DepartmentsManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDepartments()
    }
  }, [session?.user?.id])

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/departments')
      if (!response.ok) {
        // Try to seed departments if they don't exist
        const seedResponse = await fetch('/api/admin/departments/seed', {
          method: 'POST'
        })
        if (seedResponse.ok) {
          const seedData = await seedResponse.json()
          setDepartments(seedData.departments)
        } else {
          throw new Error('Failed to fetch or create departments')
        }
      } else {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      setError('Failed to load departments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDepartment = async () => {
    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create department')
      }

      const newDepartment = await response.json()
      setDepartments([newDepartment, ...departments])
      setAddDialogOpen(false)
      setFormData({ name: '', description: '' })
      setSuccess('Department created successfully')

    } catch (error) {
      console.error('Error creating department:', error)
      setError(error instanceof Error ? error.message : 'Failed to create department')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditDepartment = async () => {
    if (!selectedDepartment) return

    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update department')
      }

      const updatedDepartment = await response.json()
      setDepartments(departments.map(d => d.id === selectedDepartment.id ? updatedDepartment : d))
      setEditDialogOpen(false)
      setSelectedDepartment(null)
      setFormData({ name: '', description: '' })
      setSuccess('Department updated successfully')

    } catch (error) {
      console.error('Error updating department:', error)
      setError(error instanceof Error ? error.message : 'Failed to update department')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return

    setFormLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/departments/${selectedDepartment.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete department')
      }

      setDepartments(departments.filter(d => d.id !== selectedDepartment.id))
      setDeleteDialogOpen(false)
      setSelectedDepartment(null)
      setSuccess('Department deleted successfully')

    } catch (error) {
      console.error('Error deleting department:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete department')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditDialog = (department: Department) => {
    setSelectedDepartment(department)
    setFormData({
      name: department.name,
      description: department.description || ''
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (department: Department) => {
    setSelectedDepartment(department)
    setDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: '', description: '' })
    setError(null)
  }

  if (status === 'loading' || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6">Loading...</Typography>
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
          label: 'Back to Admin'
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Business sx={{ fontSize: 24, color: '#2E5E45' }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#2E5E45' }}>
              Department Management
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#2E5E45', opacity: 0.7 }}>
            Manage your restaurant departments for order routing
          </Typography>
        </Box>

        {/* Alerts */}
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

        {/* Add Department Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm()
              setAddDialogOpen(true)
            }}
            sx={{
              background: 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)'
              }
            }}
          >
            Add New Department
          </Button>
        </Box>

        {/* Departments Table */}
        <Card elevation={4} sx={{ borderRadius: 4 }}>
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Menu Items</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Store color="primary" />
                          <strong>{department.name}</strong>
                        </Box>
                      </TableCell>
                      <TableCell>{department.description || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${department.menuItemCount} items`} 
                          size="small"
                          color={department.menuItemCount > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(department.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(department)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => openDeleteDialog(department)}
                          color="error"
                          disabled={department.menuItemCount > 0}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {departments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No departments found. Add your first department to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Add Department Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Department</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Department Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                placeholder="e.g., Kitchen, Cafe, Water Station"
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Brief description of this department's responsibilities"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddDepartment} 
              variant="contained"
              disabled={formLoading || !formData.name.trim()}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Add Department'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Department Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Department Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditDepartment} 
              variant="contained"
              disabled={formLoading || !formData.name.trim()}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Update Department'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the department "{selectedDepartment?.name}"? 
              {selectedDepartment?.menuItemCount && selectedDepartment.menuItemCount > 0 ? (
                <span style={{ color: 'red', fontWeight: 'bold' }}>
                  <br />This department has {selectedDepartment.menuItemCount} menu items assigned. 
                  Please reassign them first.
                </span>
              ) : (
                <span><br />This action cannot be undone.</span>
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteDepartment} 
              color="error" 
              variant="contained"
              disabled={formLoading || (selectedDepartment?.menuItemCount && selectedDepartment.menuItemCount > 0)}
            >
              {formLoading ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      <Footer />
    </>
  )
}

