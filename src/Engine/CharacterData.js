const CharacterData = {
  orsi: {
    id: 'orsi',
    name: 'Yamandú Orsi',
    shortName: 'Yamandú',
    banner: 'FA',
    portrait: '/assets/images/orsi.png',
    specialName: 'MATE SPECIAL',
    slogan: '"Por la fuerza del campo y el mate cebado"',
    description: 'Ex-intendente de Canelones y actual presidente. Pelea con su termo de cuero y un termo-chorro de agua hirviendo.',
    stats: { fuerza: 80, velocidad: 65, mate: 95 }
  },
  lacalle: {
    id: 'lacalle',
    name: 'Luis Lacalle Pou',
    shortName: 'Luis',
    banner: 'PN',
    portrait: '/assets/images/lacalle.png',
    specialName: 'SURF SPECIAL',
    slogan: '"La Tahona se defiende en la ola"',
    description: 'Ex-presidente y surfista profesional. Pelea usando su agilidad física, combos de flexiones de brazo y golpes de tabla.',
    stats: { fuerza: 70, velocidad: 90, mate: 60 }
  },
  humano: {
    id: 'humano',
    name: 'El Humano',
    shortName: 'Humano',
    banner: 'UY',
    portrait: '/assets/images/humano.png',
    specialName: 'HUMANO SPECIAL',
    slogan: '"Sigan viendo, que el humano todavía no terminó"',
    description: 'Fenómeno viral del Uruguay profundo de internet: reclamo callejero, energía inclasificable y una guardia que parece inventada en vivo. En FightUY entra como leyenda bizarra, impredecible y extrañamente resistente.',
    stats: { fuerza: 74, velocidad: 58, mate: 88 }
  }
};

export const CHARACTER_IDS = Object.keys(CharacterData);

export function getCharacterData(characterId) {
  return CharacterData[characterId] || CharacterData.orsi;
}

export default CharacterData;
