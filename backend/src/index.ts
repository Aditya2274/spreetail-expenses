import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { uploadCsv } from './controllers/csvParserController';
import { supabase } from './config/supabaseClient';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/api/expenses/upload', upload.single('file'), uploadCsv);

app.get('/api/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/balances', async (req, res) => {
  const { data: users } = await supabase.from('users').select('*');
  const { data: splits } = await supabase.from('expense_splits').select('*, expenses(*)');
  const { data: settlements } = await supabase.from('settlements').select('*');

  if (!users) return res.json([]);

  const balances: Record<string, number> = {};
  users.forEach(u => balances[u.id] = 0);

  splits?.forEach(split => {
    balances[split.user_id] -= parseFloat(split.amount_owed);
    const payerId = split.expenses?.paid_by_id;
    if (payerId) {
      balances[payerId] += parseFloat(split.amount_owed);
    }
  });

  settlements?.forEach(stl => {
    balances[stl.payer_id] += parseFloat(stl.amount);
    balances[stl.payee_id] -= parseFloat(stl.amount);
  });

  const response = users.map(u => ({
    id: u.id,
    name: u.name,
    balance: balances[u.id] || 0
  }));

  res.json(response);
});

app.get('/api/users/:userId/expenses', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('expense_splits')
    .select('amount_owed, expenses(date, description, base_amount)')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });

  const formatted = data.map(d => {
    const exp: any = Array.isArray(d.expenses) ? d.expenses[0] : d.expenses;
    return {
      date: exp?.date,
      description: exp?.description,
      total_amount: exp?.base_amount,
      user_share: d.amount_owed
    };
  });

  res.json(formatted);
});

app.get('/api/anomalies', async (req, res) => {
  const { data, error } = await supabase
    .from('import_anomalies')
    .select('*')
    .eq('resolution_status', 'pending');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/anomalies/:anomalyId/resolve', async (req, res) => {
  const { anomalyId } = req.params;
  const { action } = req.body;

  const { error } = await supabase
    .from('import_anomalies')
    .update({ resolution_status: 'resolved' })
    .eq('id', anomalyId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, action });
});

app.listen(3000, () => {
  console.log('Backend server running on port 3000');
});
