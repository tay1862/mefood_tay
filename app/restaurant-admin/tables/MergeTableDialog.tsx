import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface Table {
  id: string;
  number: string;
}

interface MergeTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTableId: string;
  sourceTableNumber: string;
  tables: Table[];
}

export default function MergeTableDialog({ isOpen, onClose, sourceTableId, sourceTableNumber, tables }: MergeTableDialogProps) {
  const [targetTableId, setTargetTableId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const { toast } = useToast();

  const handleMergeTables = async () => {
    if (!targetTableId) {
      toast({ title: 'Please select a target table', variant: 'destructive' });
      return;
    }

    setIsMerging(true);
    try {
      const response = await fetch('/api/admin/tables/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTableId, targetTableId }),
      });

      if (response.ok) {
        toast({ title: 'Tables merged successfully' });
        onClose();
      } else {
        const error = await response.json();
        toast({ title: 'Failed to merge tables', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'An error occurred', description: 'Please try again later.', variant: 'destructive' });
    }
    setIsMerging(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Tables</DialogTitle>
        </DialogHeader>
        <div>
          <p>Merging orders from: <strong>{sourceTableNumber}</strong></p>
          <div className="mt-4">
            <label htmlFor="target-table">Merge into:</label>
            <Select onValueChange={setTargetTableId} value={targetTableId}>
              <SelectTrigger id="target-table">
                <SelectValue placeholder="Select a target table" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((table) => table.id !== sourceTableId)
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
          <Button variant="outline" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleMergeTables} disabled={isMerging}>
            {isMerging ? 'Merging...' : 'Merge Tables'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


