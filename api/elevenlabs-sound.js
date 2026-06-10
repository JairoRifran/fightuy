const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

// Voces especificas premium de ElevenLabs para cada candidato y narrador
const SPEAKER_VOICES = {
  announcer: 'pNInz6obpgq5epa5UR3f', // Adam (voz de narrador profunda y dramatica)
  orsi: 'ErXwobaYiN019PkySvjV',      // Antoni (voz calida, amigable, madura)
  lacalle: 'IKne3meq5aSn9XLyUdCD',   // Charlie (voz casual, energica, de mediana edad)
  humano: '2EiwWnXF2V4j26hz8qdo',    // Clyde (voz de videojuego/heroe)
};

const SOUND_PROMPTS = {
  fight: '¡Fight!',
  ko: '¡K O!',
  special_orsi: '¡Yamandú carga el mate especial, bo!',
  special_lacalle: '¡Luis lanza su ola de La Tahona!',
  special_humano: '¡El Humano resiste con fuerza!',
  voice_orsi_hit: '¡Pará la mano, che!',
  voice_lacalle_hit: '¡Cuidado con la lumbago!',
  voice_humano_hit: '¡El humano no se rinde!'
};

const TYPE_SPEAKERS = {
  fight: 'announcer',
  ko: 'announcer',
  special_orsi: 'orsi',
  special_lacalle: 'lacalle',
  special_humano: 'humano',
  voice_orsi_hit: 'orsi',
  voice_lacalle_hit: 'lacalle',
  voice_humano_hit: 'humano'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY no configurada en las variables de entorno' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      return res.status(400).json({ error: 'JSON invalido' });
    }
  }

  const type = body?.type;
  const customText = body?.text;
  const speaker = body?.speaker;

  // Determinar el texto a sintetizar
  let text = '';
  if (customText) {
    text = customText;
  } else if (type) {
    text = SOUND_PROMPTS[type];
  }

  if (!text) {
    return res.status(400).json({ error: 'Se requiere un tipo de sonido valido o un texto personalizado' });
  }

  // Determinar el locutor para seleccionar el Voice ID adecuado
  let resolvedSpeaker = 'announcer';
  if (speaker && SPEAKER_VOICES[speaker]) {
    resolvedSpeaker = speaker;
  } else if (type && TYPE_SPEAKERS[type]) {
    resolvedSpeaker = TYPE_SPEAKERS[type];
  }

  const voiceId = SPEAKER_VOICES[resolvedSpeaker] || DEFAULT_VOICE_ID;
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
        stability: 0.42,
        similarity_boost: 0.75,
        style: 0.35,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return res.status(response.status).json({
      error: 'No se pudo generar el audio por ElevenLabs',
      detail: detail.slice(0, 300)
    });
  }

  const audio = Buffer.from(await response.arrayBuffer());
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  return res.status(200).send(audio);
}
