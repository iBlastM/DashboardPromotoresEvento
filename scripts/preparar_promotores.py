import pandas as pd
import json
import re
import difflib
from pathlib import Path

BASE = Path(__file__).parent.parent
DATA_DIR = BASE / 'data'
OUT = BASE / 'data_promotores.json'

def limpiar_texto(t):
    if pd.isna(t):
        return ''
    return str(t).strip()

def parse_porcentaje(v):
    s = limpiar_texto(v).replace('%','').replace(',','.')
    try:
        return float(s)
    except:
        return 0.0

def parse_int(v):
    s = limpiar_texto(v)
    try:
        return int(float(s))
    except:
        return 0

NOMBRES_EVENTOS = {
    'corregidora': 'Corregidora San Rafael',
}

def extraer_evento(path):
    stem = Path(path).stem
    stem = re.sub(r'^(KPI_Evento_|Reporte_Metrix_Evento_\d+\s+|REPORTE_METRIX_Promotores_de_la_Paz_-_|REPORTE_METRIX_Promotores_)', '', stem, flags=re.IGNORECASE)
    stem = re.sub(r'[_-]', ' ', stem)
    stem = re.sub(r'\s+', ' ', stem).strip()
    stem = re.sub(r'\s+con horas$', '', stem, flags=re.IGNORECASE)
    key = stem.lower()
    return NOMBRES_EVENTOS.get(key, stem)

def find_header_row(df, keywords):
    for i, row in df.iterrows():
        row_str = ' '.join(str(v) for v in row if pd.notna(v))
        if any(kw in row_str for kw in keywords):
            return i
    return None

def buscar_fecha_hora(df, max_rows=12):
    """Busca fecha y hora en las primeras filas del DataFrame."""
    fecha = ''
    hora = ''
    fecha_re = re.compile(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b')
    hora_re = re.compile(r'\b(\d{1,2}:\d{2}(?::\d{2})?)\b')
    for i in range(min(max_rows, len(df))):
        for v in df.iloc[i]:
            if pd.isna(v):
                continue
            s = str(v).strip()
            if not fecha:
                m = fecha_re.search(s)
                if m:
                    fecha = m.group(1)
            if not hora:
                m = hora_re.search(s)
                if m:
                    hora = m.group(1)
            if fecha and hora:
                return fecha, hora
    return fecha, hora

def parse_resumen(df, evento):
    header_idx = find_header_row(df, ['Total Invitados', 'Total Asistentes'])
    if header_idx is None or header_idx + 1 >= len(df):
        return None
    headers = [limpiar_texto(v) for v in df.iloc[header_idx]]
    values = df.iloc[header_idx + 1]

    res = {}
    mapping = {
        'invitados': 'total_invitados',
        'asistentes': 'total_asistentes',
        'no asist': 'no_asistieron',
        'efectividad': 'efectividad_global',
        'líderes': 'total_lideres',
        'lideres': 'total_lideres',
        'tickets': 'tickets_entregados',
    }
    for h, v in zip(headers, values):
        h_low = h.lower()
        for key, target in mapping.items():
            if key in h_low:
                if target == 'efectividad_global':
                    res[target] = parse_porcentaje(v)
                else:
                    res[target] = parse_int(v)
                break

    fecha_evento, hora_evento = buscar_fecha_hora(df)
    res['fecha_evento'] = fecha_evento
    res['hora_evento'] = hora_evento
    return res

def parse_por_hora(df, evento):
    header_idx = find_header_row(df, ['Franja Horaria', 'Hora'])
    if header_idx is None:
        return []
    data = []
    for i in range(header_idx + 1, len(df)):
        row = df.iloc[i]
        val0 = limpiar_texto(row.iloc[0])
        if not val0 or val0.upper() == 'TOTAL':
            continue
        # Try to find asistentes (numeric)
        asist = 0
        pct = 0.0
        for j in range(1, min(4, len(row))):
            v = row.iloc[j]
            if pd.notna(v):
                s = limpiar_texto(v)
                if '%' in s:
                    pct = parse_porcentaje(s)
                else:
                    try:
                        asist = int(float(s))
                    except:
                        pass
        data.append({
            'evento': evento,
            'franja': val0,
            'asistentes': asist,
            'pct': pct,
        })
    return data

def parse_lideres(df, evento):
    # Find header row by looking for "Nombre del Promotor" or "Invitados"
    header_idx = None
    for i, row in df.iterrows():
        for j in range(len(row)):
            val = limpiar_texto(row.iloc[j])
            if ('nombre' in val.lower() and 'promotor' in val.lower()) or \
               ('invitados' in val.lower()):
                header_idx = i
                break
        if header_idx is not None:
            break
    
    if header_idx is None:
        return []
    
    headers = [limpiar_texto(v) for v in df.iloc[header_idx]]
    
    # Find column indices by header name
    col_nombre = None
    col_invitados = None
    col_asistieron = None
    col_noasistieron = None
    col_efectividad = None
    col_estado = None
    
    for j, h in enumerate(headers):
        h_low = h.lower()
        if 'nombre' in h_low and 'promotor' in h_low:
            col_nombre = j
        elif 'invitados' in h_low:
            col_invitados = j
        elif 'no asist' in h_low:
            col_noasistieron = j
        elif 'asistieron' in h_low or ('asist' in h_low and 'no' not in h_low):
            col_asistieron = j
        elif 'efectividad' in h_low:
            col_efectividad = j
        elif 'estado' in h_low:
            col_estado = j
    
    # Fallback to position-based if not found
    if col_nombre is None:
        col_nombre = 1
    if col_invitados is None:
        col_invitados = col_nombre + 1
    if col_asistieron is None:
        col_asistieron = col_nombre + 2
    if col_noasistieron is None:
        col_noasistieron = col_nombre + 3
    if col_efectividad is None:
        col_efectividad = col_nombre + 4
    
    data = []
    for i in range(header_idx + 1, len(df)):
        row = df.iloc[i]
        nombre = limpiar_texto(row.iloc[col_nombre])
        if not nombre or 'total' in nombre.lower() or 'promotores' in nombre.lower() or len(nombre) < 4:
            continue
        
        inv = parse_int(row.iloc[col_invitados])
        asis = parse_int(row.iloc[col_asistieron])
        noas = parse_int(row.iloc[col_noasistieron])
        efectividad = parse_porcentaje(row.iloc[col_efectividad])
        
        if col_estado is not None and col_estado < len(row):
            estado_raw = limpiar_texto(row.iloc[col_estado])
            estado = 'Cumplió' if 'cumplió' in estado_raw.lower() or 'cumplio' in estado_raw.lower() or '✅' in estado_raw else 'Bajó'
        else:
            estado = 'Cumplió' if efectividad >= 50 else 'Bajó'
        
        if efectividad == 0 and asis > 0 and inv > 0:
            efectividad = round(asis / inv * 100, 1)
        
        data.append({
            'evento': evento,
            'nombre': nombre,
            'invitados': inv,
            'asistieron': asis,
            'no_asistieron': noas,
            'efectividad': efectividad,
            'estado': estado,
        })
    return data

def parse_ciudadanos(df, evento):
    header_idx = find_header_row(df, ['Nombre', 'Ciudadano', 'Beneficiario'])
    if header_idx is None:
        return []
    headers = [limpiar_texto(v) for v in df.iloc[header_idx]]
    
    col_map = {}
    for j, h in enumerate(headers):
        h_low = h.lower()
        if ('nombre' in h_low or 'ciudadano' in h_low or 'beneficiario' in h_low) and 'lider' not in h_low and 'tutor' not in h_low:
            col_map['nombre'] = j
        elif 'lider' in h_low or 'tutor' in h_low or 'promotor' in h_low:
            col_map['lider'] = j
        elif 'asistió' in h_low or 'asistio' in h_low:
            col_map['asistio'] = j
        elif 'hora' in h_low:
            col_map['hora'] = j
        elif 'ticket' in h_low:
            col_map['ticket'] = j
        elif 'estado' in h_low:
            col_map['estado'] = j
    
    data = []
    for i in range(header_idx + 1, len(df)):
        row = df.iloc[i]
        nombre = limpiar_texto(row.iloc[col_map.get('nombre', 1)]) if 'nombre' in col_map else ''
        if not nombre or 'total' in nombre.lower():
            continue
        
        lider = limpiar_texto(row.iloc[col_map.get('lider', 2)]) if 'lider' in col_map else ''
        
        asistio = False
        if 'asistio' in col_map:
            asistio = limpiar_texto(row.iloc[col_map['asistio']]).upper() in ['SÍ', 'SI', 'S']
        elif 'estado' in col_map:
            estado_raw = limpiar_texto(row.iloc[col_map['estado']]).upper()
            asistio = 'ASISTI' in estado_raw or 'CONFIRMADO' in estado_raw
        
        ticket = False
        if 'ticket' in col_map:
            ticket_raw = limpiar_texto(row.iloc[col_map['ticket']]).upper()
            ticket = ticket_raw in ['SÍ', 'SI', 'S', '✓', 'YES']
        else:
            ticket = asistio
        
        hora = ''
        if 'hora' in col_map:
            hora = limpiar_texto(row.iloc[col_map['hora']])
        
        data.append({
            'evento': evento,
            'nombre': nombre,
            'lider': lider,
            'asistio': asistio,
            'hora_llegada': hora,
            'ticket': ticket,
            'estado': 'ASISTIÓ' if asistio else 'NO ASISTIÓ',
        })
    return data

def detect_sheet_type(df):
    """Detect sheet type by scanning first 10 rows for keywords."""
    for i in range(min(10, len(df))):
        row_str = ' '.join(str(v) for v in df.iloc[i] if pd.notna(v)).lower()
        if 'total invitados' in row_str and 'total asistentes' in row_str:
            return 'resumen'
        if 'franja horaria' in row_str or ('hora' in row_str and 'asistentes' in row_str):
            return 'por_hora'
        if ('nombre del promotor' in row_str) or ('invitados' in row_str and 'asistieron' in row_str and 'efectividad' in row_str):
            return 'lideres'
        if ('nombre ciudadano' in row_str) or ('nombre del beneficiario' in row_str) or ('asistió' in row_str and 'hora' in row_str):
            return 'ciudadanos'
    return None

def parse_excel(path):
    evento = extraer_evento(path)
    xl = pd.ExcelFile(path)
    
    resumen = None
    por_hora = []
    lideres = []
    ciudadanos = []
    
    for s in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=s, header=None)
        sheet_type = detect_sheet_type(df)
        
        if sheet_type == 'resumen':
            resumen = parse_resumen(df, evento)
            # La hoja resumen también puede contener distribución por hora
            hora_data = parse_por_hora(df, evento)
            if hora_data:
                por_hora.extend(hora_data)
        elif sheet_type == 'por_hora':
            hora_data = parse_por_hora(df, evento)
            if hora_data:
                por_hora.extend(hora_data)
        elif sheet_type == 'lideres':
            lideres = parse_lideres(df, evento)
        elif sheet_type == 'ciudadanos':
            ciudadanos = parse_ciudadanos(df, evento)
    
    # Fallback: compute resumen from lideres if not parsed
    if resumen is None and lideres:
        inv = sum(r['invitados'] for r in lideres)
        asis = sum(r['asistieron'] for r in lideres)
        noas = sum(r['no_asistieron'] for r in lideres)
        resumen = {
            'total_invitados': inv,
            'total_asistentes': asis,
            'no_asistieron': noas,
            'efectividad_global': round(asis / inv * 100, 1) if inv else 0,
            'total_lideres': len(lideres),
            'tickets_entregados': asis,
        }
    
    return {
        'evento': evento,
        'resumen': resumen or {},
        'por_hora': por_hora,
        'lideres': lideres,
        'ciudadanos': ciudadanos,
    }

# Process all Excel files
all_files = sorted(DATA_DIR.glob('*.xlsx'))
all_eventos = []
all_resumen = {}
all_meta = {}
all_por_hora = []
all_lideres = []
all_ciudadanos = []

for f in all_files:
    print(f'Procesando: {f.name}')
    try:
        data = parse_excel(f)
        all_eventos.append(data['evento'])
        all_resumen[data['evento']] = data['resumen']
        all_meta[data['evento']] = {
            'fecha': data['resumen'].get('fecha_evento', ''),
            'hora': data['resumen'].get('hora_evento', ''),
        }
        all_por_hora.extend(data['por_hora'])
        all_lideres.extend(data['lideres'])
        all_ciudadanos.extend(data['ciudadanos'])
        print(f'  -> {len(data["lideres"])} líderes, {len(data["ciudadanos"])} ciudadanos')
    except Exception as e:
        print(f'  ERROR: {e}')

# Normalizar nombres de líderes en ciudadanos para que coincidan con los oficiales
def normalizar_nombre(n):
    return ' '.join(str(n).upper().split())

print('\nNormalizando nombres de líderes...')
all_lideres_nombres = list({r['nombre'] for r in all_lideres})
norm_map = {normalizar_nombre(n): n for n in all_lideres_nombres}

mapeados = 0
for c in all_ciudadanos:
    original = c['lider']
    norm = normalizar_nombre(original)
    if norm in norm_map:
        c['lider'] = norm_map[norm]
    else:
        matches = difflib.get_close_matches(norm, norm_map.keys(), n=1, cutoff=0.80)
        if matches:
            c['lider'] = norm_map[matches[0]]
            mapeados += 1
        else:
            # Último fallback: buscar coincidencia parcial por palabras clave
            for oficial_norm, oficial in norm_map.items():
                # Si comparten al menos 2 palabras de 4+ caracteres
                palabras_orig = [p for p in norm.split() if len(p) >= 4]
                palabras_ofic = [p for p in oficial_norm.split() if len(p) >= 4]
                comunes = set(palabras_orig) & set(palabras_ofic)
                if len(comunes) >= 2:
                    c['lider'] = oficial
                    mapeados += 1
                    break

print(f'  -> {mapeados} ciudadanos mapeados a líderes por fuzzy matching')

# Compute global resumen
inv = sum(r['invitados'] for r in all_lideres)
asis = sum(r['asistieron'] for r in all_lideres)
noas = sum(r['no_asistieron'] for r in all_lideres)

global_resumen = {
    'total_invitados': inv,
    'total_asistentes': asis,
    'no_asistieron': noas,
    'efectividad_global': round(asis / inv * 100, 1) if inv else 0,
    'total_lideres': len(all_lideres),
    'tickets_entregados': sum(1 for c in all_ciudadanos if c['ticket']),
}

output = {
    'eventos': all_eventos,
    'resumen': global_resumen,
    'resumen_por_evento': all_resumen,
    'meta_eventos': all_meta,
    'por_hora': all_por_hora,
    'lideres': all_lideres,
    'ciudadanos': all_ciudadanos,
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'\nGenerado: {OUT}')
print(f'Eventos: {len(all_eventos)}')
print(f'Líderes totales: {len(all_lideres)}')
print(f'Ciudadanos totales: {len(all_ciudadanos)}')
print(f'Resumen global: {global_resumen}')
