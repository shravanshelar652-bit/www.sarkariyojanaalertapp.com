import supabase from './_supabase.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function timeline(status) {
  const now = new Date().toISOString();
  const base = [{ label: 'Application submitted', at: now, done: true }];
  base.push({ label: 'Under department review', at: status === 'Pending' ? null : now, done: status !== 'Pending' });
  base.push({ label: status === 'Rejected' ? 'Rejected with remarks' : 'Approval decision', at: ['Approved', 'Rejected'].includes(status) ? now : null, done: ['Approved', 'Rejected'].includes(status) });
  base.push({ label: 'Benefit credited to bank', at: status === 'Approved' ? now : null, done: status === 'Approved' });
  return base;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      let query = supabase
        .from('sya_applications')
        .select('*, sya_schemes(*)')
        .order('created_at', { ascending: false });
      if (user_id) query = query.eq('user_id', Number(user_id));
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, scheme_id, answers, documents } = req.body || {};
      if (!user_id || !scheme_id) return res.status(400).json({ error: 'user_id and scheme_id are required' });
      const { data, error } = await supabase
        .from('sya_applications')
        .insert({
          user_id: Number(user_id),
          scheme_id: Number(scheme_id),
          status: 'Pending',
          answers: answers || {},
          documents: documents || [],
          timeline: timeline('Pending'),
          benefit_credited: false,
          remarks: 'Application received. Documents will be verified by admin.'
        })
        .select('*, sya_schemes(*)')
        .single();
      if (error) throw error;

      await supabase.from('sya_notifications').insert({
        user_id: Number(user_id),
        title: 'Application submitted',
        message: `Your application for ${data.sya_schemes?.title || 'scheme'} is pending review.`,
        type: 'application',
        read: false
      });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, remarks } = req.body || {};
      if (!id || !status) return res.status(400).json({ error: 'id and status are required' });
      const payload = {
        status,
        remarks: remarks || `Status updated to ${status}`,
        timeline: timeline(status),
        benefit_credited: status === 'Approved',
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('sya_applications')
        .update(payload)
        .eq('id', Number(id))
        .select('*, sya_schemes(*)')
        .single();
      if (error) throw error;

      await supabase.from('sya_notifications').insert({
        user_id: data.user_id,
        title: 'Application status updated',
        message: `${data.sya_schemes?.title || 'Your scheme'} is now ${status}.`,
        type: 'status',
        read: false
      });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('sya_applications').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
