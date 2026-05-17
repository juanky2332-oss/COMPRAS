/**
 * Conocimiento compilado de los proveedores de Vidal Golosinas (Molina de Segura)
 * Basado en análisis del histórico de 22.776 pedidos OCC.
 * Incluye marcas oficiales, categorías y especialidades de cada proveedor.
 */

export interface SupplierKnowledge {
  code: string;
  name: string;
  shortName: string;
  orders: number; // histórico total
  brands: string[]; // marcas que suministran (comprobado en histórico)
  categories: string[]; // categorías principales
  keywords: string[]; // palabras clave para matching
  speciality: string; // descripción corta de especialidad
  notes: string; // información adicional útil
}

export const SUPPLIER_KNOWLEDGE: SupplierKnowledge[] = [
  {
    code: '100034920',
    name: 'INOXIDABLES DE MOLINA DE, S.L.',
    shortName: 'INOXIDABLES MOLINA',
    orders: 5983,
    brands: ['AISI 304', 'AISI 316', 'AISI 316L', 'AISI 304L', 'DIN', 'ISO'],
    categories: [
      'TUBERIA INOX', 'FITTING INOX', 'BRIDAS', 'CODOS', 'TES', 'REDUCCIONES',
      'VALVULAS INOX', 'BOMBAS INOX', 'JUNTAS BRIDA', 'SELLOS', 'MANGUERAS',
      'ABRAZADERAS', 'CHAPAS INOX', 'PERFILES INOX', 'MATERIAL CONSTRUCCION',
      'FILTROS', 'MIRILLAS', 'MANOMETROS',
    ],
    keywords: [
      'inox', 'inoxidable', 'acero inoxidable', 'aisi', '304', '316', '316l',
      'brida', 'codo', 'te soldar', 'reduccion', 'valona', 'tuberia', 'tubo soldado',
      'valvula mariposa', 'junta brida', 'abrazadera', 'mikalor', 'teflon',
      'dn', 'nw', 'fitting', 'racor inox', 'casquillo inox',
    ],
    speciality: 'Proveedor principal de material inoxidable (tubería, fittings, válvulas, bridas AISI 304/316)',
    notes: 'Proveedor de Molina de Segura. Especialista en inox para industria alimentaria.',
  },
  {
    code: '100025271',
    name: 'ELECTROMAIN ELECTRONICA IND.SL',
    shortName: 'ELECTROMAIN',
    orders: 3514,
    brands: [
      'OMRON', 'SCHNEIDER', 'SCHNEIDER ELECTRIC', 'ABB', 'LEGRAND', 'EATON', 'MOELLER',
      'PHOENIX CONTACT', 'SIEMENS', 'WURTH ELEKTRONIK', 'IFM', 'SICK',
    ],
    categories: [
      'DETECTORES', 'SENSORES', 'FINALES DE CARRERA', 'RELÉS', 'CONTACTORES',
      'MAGNETOTERMICOS', 'DIFERENCIALES', 'VARIADORES', 'PLCs', 'HMI',
      'CABLEADO', 'CONECTORES M8 M12', 'ALIMENTADORES', 'TRANSFORMADORES',
      'MAGNETOTERMICO', 'DISYUNTOR', 'TEMPORIZADOR', 'PILOTO', 'PULSADOR',
      'AUTOMATAS', 'PANTALLAS', 'CABLE APANTALLADO',
    ],
    keywords: [
      'omron', 'schneider', 'abb', 'legrand', 'eaton', 'phoenix', 'siemens',
      'detector', 'sensor', 'inductivo', 'fotoelectrico', 'final carrera',
      'rele', 'contactor', 'magnetotermico', 'diferencial', 'variador',
      'conector m8', 'conector m12', 'alimentador', 'transformador',
      'disyuntor', 'gv2', 'gv3', 'pulsador', 'seta', 'piloto', 'temporizador',
      'la1', 'la2', 'lc1', 'lc2', 'xe2', 'osmb', 'telemecanique', 'schneider',
      'pantalla tft', 'hmi', 'plc', 'automatismo', 'bornero', 'terminal',
      'e2e', 'e2b', 'omron e2', 'racor poliamida', 'prensaestopa',
    ],
    speciality: 'Proveedor principal de material eléctrico: OMRON, Schneider, ABB, Legrand, sensores, automatización',
    notes: 'Para todo lo que sea electricidad/automatización. Tienen catálogo OMRON completo y Schneider Electric.',
  },
  {
    code: '100025256',
    name: 'COMERCIAL INDUSTRIAL GARCIA,SA',
    shortName: 'C.I. GARCIA',
    orders: 3284,
    brands: [
      'SMC', 'OPTIBELT', 'BETA', 'ABB', 'SIEMENS', 'AISI', 'ISO', 'DIN',
    ],
    categories: [
      'MOTORES', 'CORREAS', 'BOMBAS', 'PINTURA', 'FERRETERIA', 'JUNTAS',
      'HIDRAULICA', 'NEUMATICA', 'ABRASIVOS', 'HERRAMIENTAS', 'LUBRICANTES',
      'MATERIAL ELECTRICO', 'TORNILLERIA', 'RODAMIENTOS',
    ],
    keywords: [
      'motor', 'motorreductor', 'smc', 'optibelt', 'beta', 'correa',
      'bomba', 'pintura', 'decapante', 'quitapintura', 'arandela', 'junta',
      'racor', 'racord', 'ferreteria', 'herramienta', 'lubricante',
      'abrasivo', 'disco', 'muela', 'tornillo', 'tuerca',
    ],
    speciality: 'Proveedor general industrial: motores, correas, bombas, ferretería, pintura, SMC',
    notes: 'Proveedor multiproducto. Buen nivel de stock en general.',
  },
  {
    code: '100025243',
    name: 'SUMINISTROS Y MT.HELLIN, SLL.',
    shortName: 'SUMINISTROS HELLIN',
    orders: 3230,
    brands: [
      'TOTAL', 'CASTROL', 'OLIPES', 'FESTO', 'GRUNDFOS', 'SKF', 'OPTIBELT',
      'BETA', 'BAHCO', 'BOSCH', 'MANN', 'ELESA', 'WURTH',
    ],
    categories: [
      'ACEITES', 'GRASAS', 'LUBRICANTES', 'NEUMATICA', 'BOMBAS', 'FILTROS',
      'HERRAMIENTAS', 'CORREAS', 'RODAMIENTOS', 'ABRASIVOS', 'MATERIAL ELECTRICO',
      'VALVULAS', 'TUBO POLIAMIDA', 'EPI', 'LIMPIEZA', 'CINTA',
    ],
    keywords: [
      'aceite', 'grasa', 'lubricante', 'total', 'olipes', 'oliterm', 'castrol',
      'festo', 'neumatica', 'cilindro neumatico', 'valvula neumatica',
      'grundfos', 'bomba centrifuga', 'skf', 'rodamiento', 'optibelt',
      'correa', 'beta', 'bahco', 'bosch', 'herramienta', 'mann', 'filtro',
      'aerotermo', 'calefactor', 'agua destilada', 'disolvente',
      'tubo poliamida', 'tubo plastico', 'elesa',
    ],
    speciality: 'Lubricantes (TOTAL/Olipes), FESTO neumática, Grundfos bombas, SKF rodamientos, herramientas',
    notes: 'Para lubricantes es el proveedor principal. También FESTO para neumática.',
  },
  {
    code: '100025236',
    name: 'CEF,ALMACEN MAT.ELECTRICO,SAU',
    shortName: 'CEF',
    orders: 1635,
    brands: [
      'LEGRAND', 'SCHNEIDER', 'OMRON', 'ILME', 'WURTH', 'GEWISS', 'HAGER',
    ],
    categories: [
      'CONECTORES ILME', 'MATERIAL ELECTRICO', 'VENTILADORES', 'CABLES',
      'MANGUERAS ELECTRICAS', 'SENSORES', 'FUENTES ALIMENTACION',
      'CLAVIJAS', 'BASES ENCHUFE', 'ARMARIOS ELECTRICOS', 'PRENSAESTOPAS',
    ],
    keywords: [
      'cef', 'legrand', 'schneider', 'omron', 'ilme', 'conector ilme',
      'clavija ilme', 'cubierta ilme', 'chv', 'ckm', 'cka', 'mdr',
      'ventilador', 'ventilacion', 'fan', 'refrigeracion armario',
      'manguera electrica', 'cable', 'hilo', 'conductor', 'latiguillo red',
      'fuente alimentacion', 'prensaestopa', 'racor electrico',
      'rejilla', 'filtro ventilador',
    ],
    speciality: 'Almacén material eléctrico: conectores ILME, ventiladores armario, cables, Legrand/Schneider',
    notes: 'Especialistas en conectores multipolares ILME y material de armario eléctrico.',
  },
  {
    code: '100025419',
    name: 'ESGAS ACCESORIOS,SL.',
    shortName: 'ESGAS',
    orders: 1363,
    brands: [
      'SKF', 'FAG', 'NTN', 'ZKL', 'CONTINENTAL', 'OPTIBELT', 'FENNER', 'REXNORD',
    ],
    categories: [
      'RODAMIENTOS', 'RETENES', 'JUNTAS', 'SELLOS', 'CADENAS', 'CORREAS',
      'ABRASIVOS', 'TRANSMISION',
    ],
    keywords: [
      'rodamiento', 'bearing', 'skf', 'fag', 'ntn', 'zkl', 'roulement',
      'reten', 'sello', 'junta torica', 'oring', 'o-ring',
      'cadena', 'union cadena', 'engrase cadena',
      'correa', 'optibelt', 'continental', 'fenner', 'poly-v',
      'abrasivo', 'disco laminas', 'lija',
      '6200', '6201', '6202', '6203', '6204', '6205', '6206', '6207', '6208',
      '6300', '6301', '6302', '6303', '6304', '6305', '6306', '6307', '6308',
      '7200', '7201', '7202', '7203', '7204', '7205', '7206',
      '30200', '30300', '22200', '22300',
      '2rs', 'zz', 'c3', '2z', 'open',
    ],
    speciality: 'Especialista en rodamientos (SKF, FAG, NTN, ZKL), retenes, juntas tóricas, cadenas, correas',
    notes: 'EL proveedor para rodamientos. Tienen todos los fabricantes principales. También retenes y correas.',
  },
  {
    code: '100025134',
    name: 'FERRETERIA DEL SEGURA,S.L.',
    shortName: 'FERRETERIA DEL SEGURA',
    orders: 1128,
    brands: [
      'FACOM', 'BETA', 'STANLEY', 'BAHCO', 'IRIMO', 'BOSCH', 'DEWALT',
      'OMRON', 'NURAL',
    ],
    categories: [
      'HERRAMIENTAS MANUALES', 'HERRAMIENTAS ELECTRICAS', 'LLAVES', 'ALICATES',
      'DESTORNILLADORES', 'PINTURA', 'ABRASIVOS', 'EPI', 'FERRETERIA',
      'TORNILLERIA', 'CINTA ADHESIVA', 'MATERIAL ELECTRICO', 'MATERIAL LIMPIEZA',
      'VENTILADORES', 'ESCALERAS', 'ESPUMAS', 'ADHESIVOS',
    ],
    keywords: [
      'facom', 'beta', 'stanley', 'bahco', 'irimo', 'bosch',
      'llave', 'llave fija', 'llave combinada', 'llave inglesa', 'llave allen', 'llave torx',
      'alicate', 'destornillador', 'martillo', 'sierra', 'serrucho', 'nivel',
      'herramienta', 'taladro', 'amoladora', 'radial',
      'pintura', 'spray', 'aerosol', 'esmalte', 'imprimacion',
      'nural', 'pegamento', 'adhesivo', 'espuma', 'poliuretano',
      'epi', 'guante', 'gafa', 'casco', 'chaleco', 'calzado seguridad',
      'cinta', 'precinto', 'brida plastico',
      'pila', 'bateria', 'enchufe', 'regleta',
      'ventilador pared', 'evaporativo',
    ],
    speciality: 'Ferretería y herramientas: FACOM, BETA, STANLEY, BAHCO, IRIMO. También EPIs, pintura y material general',
    notes: 'Para herramientas de mano (FACOM, BETA, BAHCO) es el proveedor. También consumibles ferretería.',
  },
  {
    code: '100035845',
    name: 'BERDIN LEVANTE,S.L.',
    shortName: 'BERDIN LEVANTE',
    orders: 1103,
    brands: [
      'SCHNEIDER', 'ABB', 'EATON', 'MOELLER', 'LEGRAND', 'SIEMENS', 'FLUKE',
    ],
    categories: [
      'MAGNETOTERMICOS', 'DISYUNTORES', 'CONTACTORES', 'PULSADORES',
      'AUTOMATIZACION', 'MATERIAL ELECTRICO', 'INSTRUMENTACION',
    ],
    keywords: [
      'schneider', 'abb', 'eaton', 'moeller', 'legrand', 'siemens',
      'magnetotermico', 'disyuntor', 'gv2', 'gv3', 'contacto auxiliar',
      'contactor', 'pulsador', 'seta', 'rele termico', 'guardamotor',
      'interruptor automatico', 'diferencial', 'icp', 'icu',
      'fluke', 'multimetro', 'pinza amperimetrica', 'tester',
      'brida cable', 'unex', 'canaleta',
    ],
    speciality: 'Material eléctrico de automatización: Schneider, ABB, Eaton/Moeller, Legrand. También FLUKE instrumentación',
    notes: 'Alternativa a ELECTROMAIN para material Schneider/ABB. Tienen FLUKE para instrumentos medida.',
  },
  {
    code: '100034026',
    name: 'COREFLUID,SL.',
    shortName: 'COREFLUID',
    orders: 603,
    brands: ['LOWARA', 'REXNORD', 'INA', 'ELIAS', 'IRIONDO'],
    categories: [
      'BOMBAS CENTRIFUGAS', 'BOMBAS ENGRANAJES', 'RODAMIENTOS', 'MANOMETROS',
      'JUNTAS', 'VALVULAS', 'FILTROS', 'HIDRAULICA',
    ],
    keywords: [
      'lowara', 'bomba lowara', 'bomba centrifuga', 'bomba engranajes',
      'bomba sumergible', 'electrobomba',
      'eshe', 'esv', 'sm', 'bomba lowara',
      'manometro', 'presostato',
      'rexnord', 'rodamiento ina',
      'junta brida', 'abrazadera',
    ],
    speciality: 'Bombas LOWARA (centrifugas, engranajes), manómetros, hidráulica',
    notes: 'Proveedor principal para bombas LOWARA. También bombas de engranajes Elías e Iriondo.',
  },
  {
    code: '100034082',
    name: 'HIDRAULICA DEL SEGURA,SL.',
    shortName: 'HIDRAULICA DEL SEGURA',
    orders: 354,
    brands: ['PARKER', 'GATES', 'MANULI', 'VOSS'],
    categories: [
      'MANGUERAS HIDRAULICAS', 'LATIGUILLOS', 'RACORES HIDRAULICOS',
      'JUNTAS TORICAS', 'RETENES', 'CILINDROS HIDRAULICOS',
      'ACCESORIOS HIDRAULICOS',
    ],
    keywords: [
      'latiguillo', 'manguera hidraulica', 'manguera flexible',
      'racor hidraulico', 'enchufe rapido', 'acoplamiento rapido',
      'junta torica', 'oring', 'viton', 'nbr', 'epdm',
      'cilindro hidraulico', 'vastago', 'obturador',
      '3/8', '1/2', '3/4', '1 pulgada', 'bspp', 'bsp', 'npt',
      'er', 'macho', 'hembra', 'codo hidraulico', 'te hidraulica',
    ],
    speciality: 'Hidráulica: latiguillos, mangueras, racores, juntas tóricas, cilindros hidráulicos',
    notes: 'Especialistas en hidráulica y latiguillos flexibles. Para juntas tóricas Viton/NBR también.',
  },
  {
    code: '100034454',
    name: 'ALFA CEDIVA S.L.',
    shortName: 'ALFA CEDIVA',
    orders: 162,
    brands: ['INOXPA', 'ALFA LAVAL', 'APV'],
    categories: [
      'BOMBAS ALIMENTACION', 'BOMBAS INOX SANITARIAS', 'VALVULAS INOX',
      'FILTROS INOX', 'MIRILLAS', 'ACCESORIOS ALIMENTARIOS',
    ],
    keywords: [
      'inoxpa', 'alfa laval', 'bomba sanitaria', 'bomba alimentacion',
      'bomba estampinox', 'efi', 'estampinox',
      'valvula mariposa inox', 'valvula bola inox', 'val. mariposa',
      'filtro escuadra', 'tamiz', 'mirilla', 'mirilla plana', 'mirilla tubular',
      'epdm', 'fda', 'alimentario', 'sanitario',
      'a316', 'a304', 'dn25', 'dn32', 'dn40', 'dn50', 'dn65', 'dn80', 'dn100',
    ],
    speciality: 'Bombas y válvulas sanitarias inox (INOXPA): para industria alimentaria y bebidas',
    notes: 'Especialistas en equipos sanitarios INOXPA para alimentación. Valvulería inox de alta calidad.',
  },
  {
    code: '100025088',
    name: 'SUM.INDUSTRIALES ARNALDOS,S.L.',
    shortName: 'ARNALDOS',
    orders: 152,
    brands: ['FACOM', 'STANLEY', 'BAHCO', 'BETA', 'BOSCH', 'FISCHER', 'KARCHER'],
    categories: [
      'ABRASIVOS', 'HERRAMIENTAS', 'TORNILLERIA', 'TACOS', 'BOMBAS ACHIQUE',
      'RUEDAS INDUSTRIALES', 'EPI',
    ],
    keywords: [
      'facom', 'stanley', 'bahco', 'beta', 'bosch', 'fischer',
      'disco laminas', 'disco abrasivo', 'lija', 'grano',
      'taco', 'taco fischer', 'sx', 'anclaje',
      'bomba buzo', 'karcher', 'aguas sucias',
      'rueda', 'rueda industrial', 'rueda giratoria', 'alex',
      'evaporativo', 'refrigerador',
    ],
    speciality: 'Abrasivos, herramientas (FACOM, BAHCO), tacos Fischer, bombas achique Kärcher',
    notes: 'Alternativa para herramientas y abrasivos. Tienen tacos Fischer y material de anclaje.',
  },
  {
    code: '100034152',
    name: 'PICAZO TRANSM.Y FLUIDOS,SLL.',
    shortName: 'PICAZO',
    orders: 147,
    brands: ['INA', 'SCHAEFFLER', 'SMC'],
    categories: [
      'CASQUILLOS SPEEDI-SLEEVE', 'RETENES', 'ROTULAS', 'RODAMIENTOS INA',
      'NEUMATICA SMC', 'JUNTAS',
    ],
    keywords: [
      'ina', 'schaeffler', 'smc',
      'speedi sleeve', 'speedi-sleeve', 'casquillo recuperador', 'casquillo speedi',
      'rotula', 'gikr', 'gikl', 'gikfr', 'reten doble labio', 'aduo',
      'rodamiento ina', 'casquillo', 'eje',
    ],
    speciality: 'Casquillos Speedi-Sleeve INA, rótulas, retenes doble labio, SMC neumática',
    notes: 'Únicos con Speedi-Sleeve (casquillos recuperadores de ejes desgastados INA/Schaeffler).',
  },
  {
    code: '100025244',
    name: 'SUMINISTROS INTEC,SL.',
    shortName: 'INTEC',
    orders: 117,
    brands: ['SMC', 'LEGRIS', 'NORGREN'],
    categories: [
      'TUBOS POLIAMIDA', 'TUBOS POLIURETANO', 'RACORES NEUMÁTICOS',
      'TUBOS ESPIRAL', 'ACCESORIOS NEUMATICA',
    ],
    keywords: [
      'tubo poliamida', 'tubo poliuretano', 'tubo neumatico', 'tubo azul',
      'tubo espiral', 'legris', 'smc',
      'racor neumatico', 'manguito laton', 'reduccion laton',
      'tobera ceramica', 'tig', 'tbi', 'soldadura',
      '6x8', '8x10', '10x12', '4x6',
    ],
    speciality: 'Tubería neumática (poliamida, poliuretano, espiral), racores, accesorios SMC/Legris',
    notes: 'Para tubo neumático y racores. También material de soldadura TIG.',
  },
];

function nq(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
}

function scoreOne(supplier: SupplierKnowledge, q: string): number {
  let score = 0;
  for (const brand of supplier.brands) {
    const b = nq(brand);
    if (q.includes(b) || b.includes(q)) score += 20;
  }
  for (const kw of supplier.keywords) {
    const k = kw.toLowerCase();
    if (q.includes(k)) score += kw.length >= 6 ? 8 : 5;
    else if (k.includes(q) && q.length >= 4) score += 3;
  }
  for (const cat of supplier.categories) {
    const c = nq(cat);
    if (q.includes(c) || c.split(' ').some(w => w.length >= 4 && q.includes(w))) score += 4;
  }
  return score;
}

/** Returns supplier knowledge by code */
export function getSupplierKnowledge(code: string): SupplierKnowledge | undefined {
  return SUPPLIER_KNOWLEDGE.find(s => s.code === code);
}

/** Returns Map<supplierCode, score> for all suppliers that match the query */
export function scoreSuppliersByKnowledge(query: string): Map<string, number> {
  const q = nq(query);
  const result = new Map<string, number>();
  for (const supplier of SUPPLIER_KNOWLEDGE) {
    const score = scoreOne(supplier, q);
    if (score > 0) result.set(supplier.code, score);
  }
  return result;
}

/** Find suppliers that match a query by brand, keyword or category */
export function findSuppliersByKnowledge(query: string): SupplierKnowledge[] {
  const q = nq(query);
  return SUPPLIER_KNOWLEDGE
    .map(s => ({ supplier: s, score: scoreOne(s, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.supplier);
}
