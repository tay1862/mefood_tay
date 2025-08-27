import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface Table {
  id: string;
  number: string;
}

interface MoveTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  qrSessionId: string;
  currentTableNumber: string;
  tables: Table[];
}

export default function MoveTableDialog({ isOpen, onClose, qrSessionId, currentTableNumber, tables }: MoveTableDialogProps) {
  const [newTableId, setNewTableId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const { toast } = useToast();

  const handleMoveTable = async () => {
    if (!newTableId) {
      toast({ title: 'Please select a new table', variant: 'destructive' });
      return;
    }

    setIsMoving(true);
    try {
      const response = await fetch('/api/admin/tables/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrSessionId, newTableId }),
      });

      if (response.ok) {
        toast({ title: 'Table moved successfully' });
        onClose();
      } else {
        const error = await response.json();
        toast({ title: 'Failed to move table', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'An error occurred', description: 'Please try again later.', variant: 'destructive' });
    }
    setIsMoving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Table</DialogTitle>
        </DialogHeader>
        <div>
          <p>Moving table from: <strong>{currentTableNumber}</strong></p>
          <div className="mt-4">
            <label htmlFor="new-table">Move to:</label>
            <Select onValueChange={setNewTableId} value={newTableId}>
              <SelectTrigger id="new-table">
                <SelectValue placeholder="Select a new table" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((table) => table.number !== currentTableNumber)
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.number}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleMoveTable} disabled={isMoving}>
            {isMoving ? 'Moving...' : 'Move Table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


