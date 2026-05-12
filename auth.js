import supabase from './_supabase.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const DEMO_OTP = '123456';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { action, phone, otp, profile } = req.body || {};
      if (!phone) return res.status(400).json({ error: 'Mobile number is required' });

      if (action === 'send-otp') {
        const { data: existing, error: fetchError } = await supabase
          .from('sya_users')
          .select('*')
          .eq('phone', phone)
          .limit(1);
        if (fetchError) throw fetchError;

        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase
            .from('sya_users')
            .insert({ phone, name: 'New User', state: 'Maharashtra', district: 'Pune', occupation: 'Worker', gender: 'Other', income: 150000, age: 25, preferred_language: 'en', aadhaar_verified: false });
          if (insertError) throw insertError;
        }
        return res.status(200).json({ ok: true, message: 'Demo OTP sent. Use 123456 to verify.', demoOtp: DEMO_OTP });
      }

      if (action === 'verify-otp') {
        if (otp !== DEMO_OTP) return res.status(401).json({ error: 'Invalid OTP. Demo OTP is 123456.' });
        const { data, error } = await supabase
          .from('sya_users')
          .select('*')
          .eq('phone', phone)
          .single();
        if (error) throw error;
        return res.status(200).json({ user: data, token: `demo-${data.id}-${Date.now()}` });
      }

      if (action === 'update-profile') {
        const payload = {
          name: profile?.name,
          age: Number(profile?.age || 0),
          gender: profile?.gender,
          income: Number(profile?.income || 0),
          state: profile?.state,
          district: profile?.district,
          occupation: profile?.occupation,
          preferred_language: profile?.preferred_language || 'en',
          aadhaar_verified: Boolean(profile?.aadhaar_verified),
          updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase
          .from('sya_users')
          .update(payload)
          .eq('phone', phone)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ user: data });
      }

      return res.status(400).json({ error: 'Unsupported auth action' });
    }

    if (req.method === 'GET') {
      const { phone } = req.query;
      if (!phone) return res.status(400).json({ error: 'phone query parameter is required' });
      const { data, error } = await supabase
        .from('sya_users')
        .select('*')
        .eq('phone', phone)
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
