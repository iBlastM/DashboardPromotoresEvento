"""
agregar_csv_evento.py
Procesa un CSV con columnas CIUDADANO, LÍDER / PROMOTOR, ESTATUS
y lo fusiona con data_promotores.json existente.

Uso:
    python scripts/agregar_csv_evento.py
    python scripts/agregar_csv_evento.py --csv data/otro.csv --nombre "Nombre Evento"
"""
import argparse
import json
import pandas as pd
from pathlib import Path

BASE = Path(__file__).parent.parent
OUT  = BASE / 'data_promotores.json'

# ── Config por defecto ────────────────────────────────────────────────────────
DEFAULT_CSV    = BASE / 'data' / 'Entrega_becas_primera_etapa_Secundaria.csv'
DEFAULT_NOMBRE = 'Entrega Becas Secundaria'

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--csv',    default=str(DEFAULT_CSV))
    p.add_argument('--nombre', default=DEFAULT_NOMBRE)
    p.add_argument('--fecha',  default='')   # opcional, ej. "10/05/2026"
    p.add_argument('--hora',   default='')   # opcional, ej. "10:00"
    return p.parse_args()

def main():
    args = parse_args()
    evento = args.nombre

    # ── Leer CSV ──────────────────────────────────────────────────────────────
    df = pd.read_csv(args.csv, encoding='utf-8-sig')
    df.columns = [c.strip() for c in df.columns]

    # Mapear columnas flexiblemente
    col_ciudadano = next(c for c in df.columns if 'CIUDADANO' in c.upper() or 'BENEFICIARIO' in c.upper())
    col_lider     = next(c for c in df.columns if 'LIDER' in c.upper() or 'PROMOTOR' in c.upper() or 'LÍDER' in c.upper())
    col_estatus   = next(c for c in df.columns if 'ESTATUS' in c.upper() or 'ESTADO' in c.upper())

    df = df[[col_ciudadano, col_lider, col_estatus]].copy()
    df.columns = ['ciudadano', 'lider', 'estatus']
    df = df.dropna(subset=['ciudadano'])
    df['ciudadano'] = df['ciudadano'].str.strip()
    df['lider']     = df['lider'].str.strip().fillna('')
    df['estatus']   = df['estatus'].str.strip().str.upper()
    # "ASISTIÓ" → True, "NO ASISTIÓ" → False
    df['asistio']   = df['estatus'].str.match(r'^ASISTI', na=False)

    print(f'CSV: {args.csv}')
    print(f'Evento: {evento}')
    print(f'Registros: {len(df)} | Asistieron: {df["asistio"].sum()} | No asistieron: {(~df["asistio"]).sum()}')

    # ── Construir ciudadanos ──────────────────────────────────────────────────
    ciudadanos = [
        {
            'evento':       evento,
            'nombre':       row.ciudadano,
            'lider':        row.lider,
            'asistio':      bool(row.asistio),
            'hora_llegada': '',
            'ticket':       bool(row.asistio),
            'estado':       'ASISTIÓ' if row.asistio else 'NO ASISTIÓ',
        }
        for row in df.itertuples()
    ]

    # ── Construir líderes (agregar por nombre) ────────────────────────────────
    lider_map = {}
    for row in df.itertuples():
        nombre = row.lider or 'Sin nombre'
        if nombre not in lider_map:
            lider_map[nombre] = {'invitados': 0, 'asistieron': 0, 'no_asistieron': 0}
        lider_map[nombre]['invitados']    += 1
        lider_map[nombre]['asistieron']   += int(row.asistio)
        lider_map[nombre]['no_asistieron']+= int(not row.asistio)

    lideres = []
    for nombre, agg in lider_map.items():
        inv = agg['invitados']
        asis = agg['asistieron']
        ef = round(asis / inv * 100, 1) if inv else 0
        lideres.append({
            'evento':        evento,
            'nombre':        nombre,
            'invitados':     inv,
            'asistieron':    asis,
            'no_asistieron': agg['no_asistieron'],
            'efectividad':   ef,
            'estado':        'Cumplió' if ef >= 50 else 'Bajó',
        })

    print(f'Líderes: {len(lideres)}')

    # ── Resumen del evento ────────────────────────────────────────────────────
    total_inv  = sum(l['invitados']  for l in lideres)
    total_asis = sum(l['asistieron'] for l in lideres)
    total_noas = sum(l['no_asistieron'] for l in lideres)
    resumen_evento = {
        'total_invitados':   total_inv,
        'total_asistentes':  total_asis,
        'no_asistieron':     total_noas,
        'efectividad_global': round(total_asis / total_inv * 100, 1) if total_inv else 0,
        'total_lideres':     len(lideres),
        'tickets_entregados': total_asis,
        'fecha_evento':      args.fecha,
        'hora_evento':       args.hora,
    }

    # ── Fusionar con JSON existente ───────────────────────────────────────────
    if OUT.exists():
        with open(OUT, encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {'eventos': [], 'resumen': {}, 'resumen_por_evento': {},
                'meta_eventos': {}, 'por_hora': [], 'lideres': [], 'ciudadanos': []}

    # Eliminar datos previos del mismo evento si ya existía
    if evento in data.get('eventos', []):
        print(f'Evento "{evento}" ya existe — reemplazando...')
        data['eventos']    = [e for e in data['eventos'] if e != evento]
        data['lideres']    = [l for l in data['lideres']    if l.get('evento') != evento]
        data['ciudadanos'] = [c for c in data['ciudadanos'] if c.get('evento') != evento]
        data.get('por_hora', [])  # no hay por_hora en CSV, no hace falta filtrar

    data['eventos'].append(evento)
    data.setdefault('resumen_por_evento', {})[evento] = resumen_evento
    data.setdefault('meta_eventos', {})[evento] = {
        'fecha': args.fecha,
        'hora':  args.hora,
    }
    data['lideres']    += lideres
    data['ciudadanos'] += ciudadanos

    # Recalcular resumen global
    all_lid = data['lideres']
    inv_g  = sum(l['invitados']  for l in all_lid)
    asis_g = sum(l['asistieron'] for l in all_lid)
    noas_g = sum(l['no_asistieron'] for l in all_lid)
    data['resumen'] = {
        'total_invitados':    inv_g,
        'total_asistentes':   asis_g,
        'no_asistieron':      noas_g,
        'efectividad_global': round(asis_g / inv_g * 100, 1) if inv_g else 0,
        'total_lideres':      len(all_lid),
        'tickets_entregados': sum(1 for c in data['ciudadanos'] if c.get('ticket')),
    }

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'\nGenerado: {OUT}')
    print(f'Total eventos: {len(data["eventos"])}')
    print(f'Resumen global: {data["resumen"]}')

if __name__ == '__main__':
    main()
