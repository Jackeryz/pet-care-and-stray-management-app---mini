import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calculator, NotebookText, Plus, Trash2 } from 'lucide-react';

type LivestockEntry = {
  id: number;
  animal: string;
  count: number;
  note?: string;
};

type MoneyNote = {
  id: number;
  title: string;
  amount: number;
  note?: string;
};

const LIVESTOCK_STORAGE_KEY = 'pet-mini-farmer-livestock';
const MONEY_STORAGE_KEY = 'pet-mini-farmer-money-notes';

export default function LivestockTab() {
  const [animal, setAnimal] = useState('');
  const [count, setCount] = useState('1');
  const [entryNote, setEntryNote] = useState('');
  const [entries, setEntries] = useState<LivestockEntry[]>([]);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('0');
  const [moneyNote, setMoneyNote] = useState('');
  const [notes, setNotes] = useState<MoneyNote[]>([]);

  useEffect(() => {
    const storedEntries = window.localStorage.getItem(LIVESTOCK_STORAGE_KEY);
    const storedNotes = window.localStorage.getItem(MONEY_STORAGE_KEY);

    if (storedEntries) {
      setEntries(JSON.parse(storedEntries));
    }
    if (storedNotes) {
      setNotes(JSON.parse(storedNotes));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LIVESTOCK_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    window.localStorage.setItem(MONEY_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const totalAnimals = useMemo(() => entries.reduce((sum, entry) => sum + entry.count, 0), [entries]);
  const netAmount = useMemo(() => notes.reduce((sum, item) => sum + item.amount, 0), [notes]);

  const handleAddLivestock = () => {
    const numericCount = Number(count);
    if (!animal.trim() || Number.isNaN(numericCount) || numericCount <= 0) return;

    setEntries([
      ...entries,
      {
        id: Date.now(),
        animal: animal.trim(),
        count: numericCount,
        note: entryNote.trim() || undefined,
      },
    ]);

    setAnimal('');
    setCount('1');
    setEntryNote('');
  };

  const handleAddMoneyNote = () => {
    const numericAmount = Number(amount);
    if (!title.trim() || Number.isNaN(numericAmount)) return;

    setNotes([
      ...notes,
      {
        id: Date.now(),
        title: title.trim(),
        amount: numericAmount,
        note: moneyNote.trim() || undefined,
      },
    ]);

    setTitle('');
    setAmount('0');
    setMoneyNote('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Livestock Counter
          </CardTitle>
          <CardDescription>
            Add your animals and keep an up-to-date total count.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Animal type</Label>
              <Input value={animal} onChange={(e) => setAnimal(e.target.value)} placeholder="e.g., Cows" />
            </div>
            <div className="space-y-2">
              <Label>Count</Label>
              <Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={entryNote} onChange={(e) => setEntryNote(e.target.value)} placeholder="Breed / health / age" />
            </div>
          </div>

          <Button onClick={handleAddLivestock}>
            <Plus className="mr-2 h-4 w-4" />
            Add livestock
          </Button>

          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Total livestock count</p>
            <p className="text-3xl font-bold">{totalAnimals}</p>
          </div>

          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No livestock entries yet.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{entry.animal}</p>
                    <p className="text-sm text-muted-foreground">Count: {entry.count}</p>
                    {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEntries(entries.filter((e) => e.id !== entry.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotebookText className="h-5 w-5" />
            Monetary Notes
          </CardTitle>
          <CardDescription>
            Track purchases/sales and keep notes for farm accounting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Feed purchase" />
            </div>
            <div className="space-y-2">
              <Label>Amount (+ income, - expense)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea value={moneyNote} onChange={(e) => setMoneyNote(e.target.value)} placeholder="Transaction notes" />
            </div>
          </div>

          <Button onClick={handleAddMoneyNote}>
            <Plus className="mr-2 h-4 w-4" />
            Add note
          </Button>

          <div className="rounded-md border p-3">
            <p className="text-sm text-muted-foreground">Net total</p>
            <p className="text-3xl font-bold">{netAmount.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monetary notes yet.</p>
            ) : (
              notes.map((item) => (
                <div key={item.id} className="flex items-start justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <Badge variant={item.amount >= 0 ? 'default' : 'destructive'}>
                      {item.amount >= 0 ? '+' : ''}{item.amount.toFixed(2)}
                    </Badge>
                    {item.note && <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setNotes(notes.filter((n) => n.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
