import supabase from './_supabase.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });
      const { data, error } = await supabase
        .from('sya_bank_accounts')
        .select('*')
        .eq('user_id', Number(user_id))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, account_holder, account_number, ifsc, bank_name } = req.body || {};
      if (!user_id || !account_number || !ifsc) return res.status(400).json({ error: 'user_id, account_number and IFSC are required' });
      const masked = `XXXX${String(account_number).slice(-4)}`;
      const { data, error } = await supabase
        .from('sya_bank_accounts')
        .insert({
          user_id: Number(user_id),
          account_holder,
          account_number_masked: masked,
          ifsc: String(ifsc).toUpperCase(),
          bank_name: bank_name || 'Gramin Bank',
          verified: true,
          benefit_status: 'Ready for DBT credit'
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('sya_bank_accounts').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
