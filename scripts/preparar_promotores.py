import pandas as pd
import json
import re
from pathlib import Path

BASE = Path(__file__).parent.parent
EXCEL = BASE / 'data' / 'KPI_Evento_Corregidora_con_horas.xlsx'
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

# Leer hojas
xl = pd.ExcelFile(EXCEL)

# --- Resumen Evento ---
df_resumen = xl.parse('Resumen Evento', header=None)
# Buscar fila con encabezados de KPIs
meta_fecha = ''
meta_lugar = ''
for _, row in df_resumen.iterrows():
    val = limpiar_texto(row.get(0,''))
    if val.startswith('Fecha del evento:'):
        m = re.search(r'Fecha del evento:\s*([^|]+)\|\s*Lugar:\s*([^|]+)', val)
        if m:
            meta_fecha = m.group(1).strip()
            meta_lugar = m.group(2).strip()
        break

# Fila de encabezados de KPIs (Total Invitados...)
kpi_headers = None
kpi_values = None
for i, row in df_resumen.iterrows():
    val0 = limpiar_texto(row.get(0,''))
    if val0 == 'Total Invitados':
        kpi_headers = [limpiar_texto(row.get(c,'')) for c in range(6)]
        kpi_values = df_resumen.iloc[i+1]
        break

resumen = {}
if kpi_headers and kpi_values is not None:
    mapping = {
        'Total Invitados': 'total_invitados',
        'Total Asistentes': 'total_asistentes',
        'No Asistieron': 'no_asistieron',
        'Efectividad Global': 'efectividad_global',
        'Total Líderes': 'total_lideres',
        'Tickets Entregados': 'tickets_entregados',
    }
    for h, v in zip(kpi_headers, kpi_values):
        key = mapping.get(h)
        if key:
            if 'efectividad' in key:
                resumen[key] = parse_porcentaje(v)
            else:
                resumen[key] = parse_int(v)

# Distribución por hora
por_hora = []
capturar_hora = False
for _, row in df_resumen.iterrows():
    val0 = limpiar_texto(row.get(0,''))
    if val0 == 'DISTRIBUCIÓN DE LLEGADAS POR HORA':
        capturar_hora = True
        continue
    if capturar_hora and val0 == 'Franja Horaria':
        continue
    if capturar_hora and val0:
        if val0 == 'TOTAL':
            break
        por_hora.append({
            'franja': val0,
            'asistentes': parse_int(row.get(1,0)),
            'pct': parse_porcentaje(row.get(2,0)),
        })

# --- KPIs por Líder ---
df_lideres = xl.parse('KPIs por Líder', header=1)
# Renombrar columnas por índice para evitar problemas de encoding
df_lideres.columns = ['ranking_raw','nombre','invitados','asistieron','no_asistieron','efectividad_raw','estado_raw']
# Filtrar filas de datos (excluir TOTAL)
lideres = []
for _, row in df_lideres.iterrows():
    nombre = limpiar_texto(row['nombre'])
    if not nombre or nombre.lower() in ['nombre del promotor/lider','total',''] or 'promotores' in nombre.lower():
        continue
    estado_raw = limpiar_texto(row['estado_raw'])
    estado = 'Cumplió' if 'Cumplió' in estado_raw or 'cumplió' in estado_raw or '✅' in estado_raw else 'Bajó'
    # ranking_raw como '#1'
    ranking = parse_int(row['ranking_raw'].replace('#','')) if pd.notna(row['ranking_raw']) else 0
    lideres.append({
        'ranking': ranking,
        'nombre': nombre,
        'invitados': parse_int(row['invitados']),
        'asistieron': parse_int(row['asistieron']),
        'no_asistieron': parse_int(row['no_asistieron']),
        'efectividad': parse_porcentaje(row['efectividad_raw']),
        'estado': estado,
    })

# --- Ciudadanos Detalle ---
df_ciudadanos = xl.parse('Ciudadanos Detalle', header=1)
df_ciudadanos.columns = ['num','nombre','lider','asistio_raw','hora_llegada','ticket_raw','estado_raw']
ciudadanos = []
for _, row in df_ciudadanos.iterrows():
    nombre = limpiar_texto(row['nombre'])
    if not nombre or nombre.lower() in ['nombre ciudadano','total','']:
        continue
    asistio = limpiar_texto(row['asistio_raw']).upper() == 'SÍ'
    ticket = limpiar_texto(row['ticket_raw']).upper() == 'SÍ'
    ciudadanos.append({
        'nombre': nombre,
        'lider': limpiar_texto(row['lider']),
        'asistio': asistio,
        'hora_llegada': limpiar_texto(row['hora_llegada']),
        'ticket': ticket,
        'estado': limpiar_texto(row['estado_raw']),
    })

output = {
    'meta': {
        'evento': 'EVT-CORREGIDORA',
        'fecha': meta_fecha,
        'lugar': meta_lugar,
        'generado': meta_fecha,
    },
    'resumen': resumen,
    'por_hora': por_hora,
    'lideres': lideres,
    'ciudadanos': ciudadanos,
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'Generado: {OUT} ({len(lideres)} líderes, {len(ciudadanos)} ciudadanos)')
