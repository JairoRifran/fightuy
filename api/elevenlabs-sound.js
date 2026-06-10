const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const SOUND_PROMPTS = {
  fight: 'Fight!',
  ko: 'K O!',
  special_orsi: 'Yamandu carga el mate especial!',
  special_lacalle: 'Luis lanza su especial!',
  special_humano: 'El Humano no termino todavia!',
  voice_orsi_hit: 'Uh, me pego!',
  voice_lacalle_hit: 'Eso dolio.',
  voice_humano_hit: 'El humano resiste!'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY no configurada' });
  }

  const type = req.body?.type;
  const text = SOUND_PROMPTS[type];
  if (!text) {
    return res.status(400).json({ error: 'Tipo de sonido invalido' });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.38,
        similarity_boost: 0.72,
        style: 0.25,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return res.status(response.status).json({
      error: 'No se pudo generar el audio',
      detail: detail.slice(0, 300)
    });
  }

  const audio = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return res.status(200).send(audio);
}
