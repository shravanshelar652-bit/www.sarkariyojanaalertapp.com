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
      const { q, category, state } = req.query;
      let query = supabase.from('sya_schemes').select('*').order('deadline', { ascending: true });
      if (category && category !== 'All') query = query.eq('category', category);
      if (state && state !== 'All India') query = query.in('state', ['All India', state]);
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { data, error } = await supabase
        .from('sya_schemes')
        .insert({
          title: body.title,
          category: body.category,
          state: body.state || 'All India',
          description: body.description,
          eligibility: body.eligibility || '',
          documents: body.documents || '',
          benefits: body.benefits || '',
          deadline: body.deadline,
          official_link: body.official_link || '#',
          min_age: Number(body.min_age || 0),
          max_income: Number(body.max_income || 999999999),
          occupation_match: body.occupation_match || 'Any',
          gender_match: body.gender_match || 'Any',
          source: body.source || 'Admin Portal',
          active: body.active !== false
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...body } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase
        .from('sya_schemes')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('sya_schemes').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
