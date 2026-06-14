import fs from 'fs';
import csv from 'csv-parser';
import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';

const HARDCODED_USD_INR_RATE = 83;

const formatName = (name: string) => {
  if (!name) return '';
  return name.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
  if (parts.length !== 3) return null;

  let year, month, day;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }
  return new Date(year, month - 1, day);
};

export const uploadCsv = async (req: Request, res: Response) => {
  try {
    const filePath = req.file?.path;
    const uploaderId = req.body.userId;
    if (!filePath) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (uploaderId) {
      console.log(`[CSV Import] Initiated by User ID: ${uploaderId}`);
    }

    const rows: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', async () => {
        await processRows(rows, res);
      });
  } catch (error) {
    console.error('CSV Upload Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const processRows = async (rawRows: any[], res: Response) => {
  const { data: users } = await supabase.from('users').select('*');
  const { data: memberships } = await supabase.from('group_memberships').select('*');
  
  const userMap = new Map(users?.map(u => [u.name.toLowerCase(), u.id]) || []);
  const anomaliesToInsert: any[] = [];
  const expensesToInsert: any[] = [];
  const settlementsToInsert: any[] = [];

  const processedExpenses: any[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const anomalies: string[] = [];
    let status = 'active';
    let isActionRequired = false;
    let isPendingReview = false;
    
    let parsedDate = parseDate(row.date);
    if (!parsedDate) {
      anomalies.push('Missing or invalid date; defaulted to current date for quarantine');
      parsedDate = new Date();
      isPendingReview = true;
    }
    
    const originalPayer = row.paid_by || '';
    let payerName = formatName(originalPayer);
    if (payerName.toLowerCase() !== originalPayer.trim().toLowerCase()) {
      anomalies.push(`Corrected formatting for payer name from '${originalPayer}' to '${payerName}'`);
    }

    let payerId = null;
    if (!payerName) {
      anomalies.push('Missing paid_by field; flagged for user to assign later');
      isPendingReview = true;
    } else {
      payerId = userMap.get(payerName.toLowerCase()) || null;
      if (!payerId) {
          anomalies.push(`Payer '${payerName}' not found in database`);
          isPendingReview = true;
      }
    }

    const desc = (row.description || '').toLowerCase();
    const isSettlement = desc.includes('paid back') || desc.includes('deposit share') || desc.includes('repayment') || desc.includes('settled');
    if (isSettlement) {
      if (payerId) {
         const payeeStr = row.split_with || '';
         const payeeName = formatName(payeeStr.split(/[,;]/)[0]); 
         const payeeId = userMap.get(payeeName.toLowerCase()) || null;
         
         settlementsToInsert.push({
           payer_id: payerId,
           payee_id: payeeId,
           amount: Math.abs(parseFloat(row.amount || '0')),
           date: parsedDate
         });
      }
      continue;
    }

    let amount = parseFloat(row.amount || '0');
    if (amount === 0) {
      anomalies.push('Zero-amount expense logged');
    }

    let isRefund = false;
    if (amount < 0) {
      amount = Math.abs(amount);
      isRefund = true;
      anomalies.push('Negative amount converted to positive refund logic');
    }

    let currency = row.currency?.toUpperCase() || '';
    if (!currency || currency === 'NAN') {
      currency = 'INR';
      anomalies.push('Missing currency defaulted to INR');
    }

    let convertedInr = amount;
    if (currency === 'USD') {
      convertedInr = amount * HARDCODED_USD_INR_RATE;
      anomalies.push('USD converted to INR using hardcoded static rate');
    }

    let splitWith = row.split_with ? row.split_with.split(/[,;]/).map((s: string) => formatName(s)) : [];
    let splitType = row.split_type?.toLowerCase() || 'equal';
    let splitDetails = row.split_details ? row.split_details.split(',').map((s: string) => parseFloat(s)) : [];

    if (splitType === 'equal' && splitDetails.length > 0) {
      anomalies.push("Conflicting split types: 'equal' takes precedence over numeric details");
      splitDetails = [];
    }

    if (splitType === 'percentage') {
      const sum = splitDetails.reduce((a: number, b: number) => a + b, 0);
      if (sum > 100) {
        anomalies.push('Invalid percentage splits sum > 100%');
        isActionRequired = true;
      }
    }

    const recognizedMembers: string[] = [];
    const guests: string[] = [];
    splitWith.forEach((name: string) => {
      if (userMap.has(name.toLowerCase())) {
        recognizedMembers.push(name);
      } else {
        guests.push(name);
        anomalies.push(`Unrecognized guest '${name}' absorbed by group`);
      }
    });

    if (parsedDate) {
      recognizedMembers.forEach((name: string) => {
        const uId = userMap.get(name.toLowerCase());
        const mem = memberships?.find(m => m.user_id === uId);
        if (mem && mem.left_at && new Date(mem.left_at) < parsedDate) {
          anomalies.push(`Member '${name}' moved out prior to expense date. Action required to update split_with.`);
          isActionRequired = true;
        }
      });
    }

    if (isActionRequired) {
      status = 'action_required';
    } else if (isPendingReview || anomalies.length > 0) {
      status = 'pending_review';
    }

    const duplicateOf = processedExpenses.find(e => 
       e.date?.getTime() === parsedDate?.getTime() &&
       e.description.toLowerCase() === row.description.toLowerCase()
    );

    if (duplicateOf) {
      if (duplicateOf.base_amount === amount && duplicateOf.paid_by_id === payerId) {
        anomalies.push('Exact duplicate detected');
        duplicateOf.status = 'pending_review';
        status = 'pending_review';
      } else {
        anomalies.push('Conflicting duplicate detected (same event, different amounts/payers)');
        duplicateOf.status = 'pending_review';
        status = 'pending_review';
      }
    }

    processedExpenses.push({
      original_index: i + 1,
      date: parsedDate,
      description: row.description,
      paid_by_id: payerId,
      base_amount: amount,
      currency: currency,
      converted_inr_amount: convertedInr,
      status: status,
      raw_data: row,
      anomalies,
      isRefund,
      recognizedMembers,
      splitType,
      splitDetails
    });
  }

  try {
    for (const exp of processedExpenses) {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          date: exp.date,
          description: exp.description,
          paid_by_id: exp.paid_by_id,
          base_amount: exp.base_amount,
          currency: exp.currency,
          converted_inr_amount: exp.converted_inr_amount,
          status: exp.status
        })
        .select()
        .single();
        
      if (expenseError) throw expenseError;
      const expenseId = expenseData.id;

      for (const anomalyText of exp.anomalies) {
        await supabase.from('import_anomalies').insert({
          original_row_index: exp.original_index,
          raw_data: exp.raw_data,
          anomaly_type: anomalyText,
          resolution_status: 'pending'
        });
      }

      if (exp.status === 'action_required') continue;

      const validMembers = exp.recognizedMembers;
      if (validMembers.length === 0) continue;

      let splitAmounts: { [key: string]: number } = {};

      if (exp.splitType === 'equal') {
        const share = exp.converted_inr_amount / validMembers.length;
        validMembers.forEach((name: string) => splitAmounts[name] = share);
      } else if (exp.splitType === 'percentage') {
        validMembers.forEach((name: string, idx: number) => {
           const pct = exp.splitDetails[idx] || 0;
           splitAmounts[name] = (pct / 100) * exp.converted_inr_amount;
        });
      }

      for (const [memberName, amountOwed] of Object.entries(splitAmounts)) {
         let debtorId = userMap.get(memberName.toLowerCase());
         if (exp.isRefund) debtorId = exp.paid_by_id;

         if (debtorId) {
             await supabase.from('expense_splits').insert({
                 expense_id: expenseId,
                 user_id: debtorId,
                 amount_owed: exp.isRefund ? -amountOwed : amountOwed
             });
         }
      }
    }

    for (const stl of settlementsToInsert) {
      await supabase.from('settlements').insert(stl);
    }

    res.json({ success: true, message: 'CSV Processing Complete' });
  } catch (dbError) {
    console.error('Database Insertion Error:', dbError);
    res.status(500).json({ error: 'Database transaction failed' });
  }
};
