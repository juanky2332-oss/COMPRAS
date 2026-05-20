#!/usr/bin/env python3
"""
Procesa los 4 Excels en data/raw/ y genera los JSONs en data/ y public/data/.

Inputs (data/raw/):
  - codigos_sap.xlsx                  cols: Material, Descripción de material, Centro
  - proveedores.xlsx                  cols: Proveedor mercancías, Clave de país/reg., Población, Proveedor preferente, Import.estratégica, DUNS
  - proveedores_habituales_marcas.xlsx (matriz: 1 columna por proveedor habitual, las filas son marcas/notas)
  - historico_compras.xlsx            cols: Proveedor/Centro suministrador, Código SAP/ Material, Texto breve, Fecha documento, Precio neto, Cantidad de pedido, Centro

Outputs (data/):
  - codigos_sap.json
  - proveedores.json
  - proveedores_habituales.json
  - proveedores_habituales_enriched.json   (cross-reference de los 3 anteriores)
  - sap_to_proveedores.json
  - proveedor_to_saps.json
  - materiales_index.json
  - stats.json

También copia a public/data/ los JSONs que el endpoint API necesita.

Uso:
  python3 scripts/build-knowledge.py
"""
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Falta dependencia. Instala con: pip install pandas openpyxl", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"
PUB = ROOT / "public" / "data"
PUB.mkdir(parents=True, exist_ok=True)


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(s).lower())


# ---------------------------------------------------------------------------
# 1. CODIGOS SAP
# ---------------------------------------------------------------------------
df_sap = pd.read_excel(RAW / "codigos_sap.xlsx")
df_sap.columns = ["material", "descripcion", "centro"]
df_sap["material"] = df_sap["material"].astype(str).str.strip()
df_sap["descripcion"] = df_sap["descripcion"].astype(str).str.strip()
df_sap["centro"] = df_sap["centro"].astype(str).str.strip()
df_sap = df_sap[df_sap["material"].str.match(r"^\d+$")]
codigos_sap = df_sap.to_dict(orient="records")
(OUT / "codigos_sap.json").write_text(json.dumps(codigos_sap, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"codigos_sap.json: {len(codigos_sap)} materiales")


# ---------------------------------------------------------------------------
# 2. PROVEEDORES (catálogo SAP)
# ---------------------------------------------------------------------------
df_prov = pd.read_excel(RAW / "proveedores.xlsx")
df_prov.columns = ["nombre_raw", "pais", "poblacion", "preferente", "estrategica", "duns"]
df_prov["id"] = df_prov["nombre_raw"].apply(lambda n: (m := re.search(r"\(([^)]+)\)\s*$", str(n))) and m.group(1))
df_prov["nombre"] = df_prov["nombre_raw"].apply(lambda n: re.sub(r"\s*\([^)]+\)\s*$", "", str(n)).strip())
df_prov["preferente"] = df_prov["preferente"].fillna(0).astype(int).astype(bool)
df_prov = df_prov[~df_prov["nombre"].str.contains(r"\*\*|ELIMINAR|REUTILIZAR", case=False, na=False)]
proveedores_catalogo = df_prov[["id", "nombre", "pais", "poblacion", "preferente", "estrategica", "duns"]].to_dict(orient="records")
(OUT / "proveedores.json").write_text(json.dumps(proveedores_catalogo, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"proveedores.json: {len(proveedores_catalogo)} proveedores")


# ---------------------------------------------------------------------------
# 3. PROVEEDORES HABITUALES Y MARCAS (matriz)
# ---------------------------------------------------------------------------
df_hab = pd.read_excel(RAW / "proveedores_habituales_marcas.xlsx")
prov_hab = []
for col in df_hab.columns:
    marcas, notas = [], []
    for v in df_hab[col].dropna():
        s = str(v).strip()
        if not s or s.lower() == "nan":
            continue
        if len(s) > 60 or re.search(r"(MEJOR|SALE|PROVEEDORES|DESCUENTOS|EQUIPOS|TRANSPORTADORAS)", s, re.I):
            notas.append(s)
        else:
            marcas.append(s)
    if marcas or notas:
        prov_hab.append({"proveedor": col.strip(), "marcas": marcas, "notas": notas})
(OUT / "proveedores_habituales.json").write_text(json.dumps(prov_hab, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"proveedores_habituales.json: {len(prov_hab)} proveedores")


# ---------------------------------------------------------------------------
# 4. HISTÓRICO → derivados
# ---------------------------------------------------------------------------
df_h = pd.read_excel(RAW / "historico_compras.xlsx").rename(columns={
    "Proveedor/Centro suministrador": "proveedor",
    "Código SAP/ Material": "codigo_sap",
    "Texto breve": "descripcion",
    "Fecha documento": "fecha",
    "Precio neto": "precio",
    "Cantidad de pedido": "cantidad",
    "Centro": "centro",
})[["proveedor", "codigo_sap", "descripcion", "fecha", "precio", "cantidad", "centro"]]
df_h["codigo_sap"] = df_h["codigo_sap"].astype(str).str.strip()
df_h["proveedor"] = df_h["proveedor"].astype(str).str.strip()
df_h["descripcion"] = df_h["descripcion"].fillna("").astype(str).str.strip()
df_h = df_h.dropna(subset=["codigo_sap", "proveedor"])
df_h = df_h[df_h["codigo_sap"] != "nan"]


def parse_prov(p):
    m = re.match(r"^(\d+)\s+(.*)$", str(p))
    return (m.group(1), m.group(2).strip()) if m else (None, str(p).strip())


df_h["prov_id"], df_h["prov_nombre"] = zip(*df_h["proveedor"].apply(parse_prov))
df_h["fecha"] = pd.to_datetime(df_h["fecha"], errors="coerce")

sap_to_prov = defaultdict(lambda: defaultdict(lambda: {"compras": 0, "ultima_fecha": None, "precios": [], "descripcion": ""}))
for _, row in df_h.iterrows():
    key = (row["prov_id"], row["prov_nombre"])
    e = sap_to_prov[row["codigo_sap"]][key]
    e["compras"] += 1
    if pd.notna(row["fecha"]) and (e["ultima_fecha"] is None or row["fecha"] > e["ultima_fecha"]):
        e["ultima_fecha"] = row["fecha"]
    if pd.notna(row["precio"]) and row["precio"] > 0:
        e["precios"].append(float(row["precio"]))
    if row["descripcion"] and not e["descripcion"]:
        e["descripcion"] = row["descripcion"]

sap_to_prov_clean = {}
for sap, proves in sap_to_prov.items():
    lista = []
    for (pid, pname), d in proves.items():
        precios = d.pop("precios")
        lista.append({
            "proveedor_id": pid,
            "proveedor_nombre": pname,
            "compras": d["compras"],
            "ultima_fecha": d["ultima_fecha"].strftime("%Y-%m-%d") if d["ultima_fecha"] else None,
            "precio_min": min(precios) if precios else None,
            "precio_max": max(precios) if precios else None,
            "precio_promedio": round(sum(precios) / len(precios), 2) if precios else None,
            "descripcion_historica": d["descripcion"],
        })
    lista.sort(key=lambda x: (x["compras"], x["ultima_fecha"] or ""), reverse=True)
    sap_to_prov_clean[sap] = lista
(OUT / "sap_to_proveedores.json").write_text(json.dumps(sap_to_prov_clean, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"sap_to_proveedores.json: {len(sap_to_prov_clean)} códigos con historial")

prov_to_sap = defaultdict(lambda: defaultdict(lambda: {"compras": 0, "ultima_fecha": None, "descripcion": ""}))
for _, row in df_h.iterrows():
    e = prov_to_sap[row["prov_nombre"]][row["codigo_sap"]]
    e["compras"] += 1
    if pd.notna(row["fecha"]) and (e["ultima_fecha"] is None or row["fecha"] > e["ultima_fecha"]):
        e["ultima_fecha"] = row["fecha"]
    if row["descripcion"] and not e["descripcion"]:
        e["descripcion"] = row["descripcion"]

prov_to_sap_clean = {}
for pname, saps in prov_to_sap.items():
    lista = [{
        "codigo_sap": sap, "descripcion": d["descripcion"], "compras": d["compras"],
        "ultima_fecha": d["ultima_fecha"].strftime("%Y-%m-%d") if d["ultima_fecha"] else None,
    } for sap, d in saps.items()]
    lista.sort(key=lambda x: (-x["compras"], x["ultima_fecha"] or ""))
    prov_to_sap_clean[pname] = lista
(OUT / "proveedor_to_saps.json").write_text(json.dumps(prov_to_sap_clean, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"proveedor_to_saps.json: {len(prov_to_sap_clean)} proveedores con historial")


# ---------------------------------------------------------------------------
# 5. ENRICHED (cross-reference)
# ---------------------------------------------------------------------------
ALIAS = {
    "BERDIN": "BERDIN LEVANTE,S.L.",
    "ELECTROMAIN": "ELECTROMAIN ELECTRONICA IND.SL",
    "CEF": "CEF,ALMACEN MAT.ELECTRICO,SAU",
    "PICAZO": "PICAZO TRANSM.Y FLUIDOS,SLL.",
    "INTEC": "SUMINISTROS INTEC,SL.",
    "COMERCIAL": "COMERCIAL INDUSTRIAL GARCIA,SA",
    "ALFA CEDIVA": "ALFA CEDIVA S.L.",
    "Hidráulica del segura": "HIDRAULICA DEL SEGURA,SL.",
}

cat_by_name = {norm(p["nombre"]): p for p in proveedores_catalogo}
hist_by_name = {}
for nombre, saps in prov_to_sap_clean.items():
    hist_by_name[norm(nombre)] = {
        "nombre": nombre,
        "items_distintos": len(saps),
        "compras": sum(s["compras"] for s in saps),
    }

enriched = []
seen_keys = set()
for prov in prov_hab:
    short = prov["proveedor"]
    alias = ALIAS.get(short, short)
    n_alias = norm(alias)
    n_short = norm(short)
    cat_match = cat_by_name.get(n_alias) or cat_by_name.get(n_short)
    hist_match = hist_by_name.get(n_alias) or hist_by_name.get(n_short)
    if not cat_match:
        for k, v in cat_by_name.items():
            if (n_short in k or k in n_short) and len(n_short) >= 4:
                cat_match = v; break
    if not hist_match:
        for k, v in hist_by_name.items():
            if (n_short in k or k in n_short) and len(n_short) >= 4:
                hist_match = v; break
    enriched.append({
        "nombre_corto": short,
        "nombre_oficial": cat_match["nombre"] if cat_match else (hist_match["nombre"] if hist_match else short),
        "id_sap": cat_match["id"] if cat_match else None,
        "marcas": prov["marcas"],
        "notas": prov["notas"],
        "tiene_historial": bool(hist_match),
        "compras_historicas": hist_match["compras"] if hist_match else 0,
        "items_distintos": hist_match["items_distintos"] if hist_match else 0,
        "actividad": "",
        "email": "",
        "telefono": "",
        "web_oficial": "",
        "direccion": "",
        "poblacion": cat_match["poblacion"] if cat_match else "",
        "pais": cat_match["pais"] if cat_match else "",
        "preferente": cat_match["preferente"] if cat_match else False,
    })
    seen_keys.add(norm(short))
    seen_keys.add(norm(alias))

# Add purely-historic suppliers not already in matrix
for k, info in hist_by_name.items():
    if k in seen_keys:
        continue
    cat_match = cat_by_name.get(k)
    enriched.append({
        "nombre_corto": info["nombre"],
        "nombre_oficial": cat_match["nombre"] if cat_match else info["nombre"],
        "id_sap": cat_match["id"] if cat_match else None,
        "marcas": [], "notas": [],
        "tiene_historial": True,
        "compras_historicas": info["compras"],
        "items_distintos": info["items_distintos"],
        "actividad": "", "email": "", "telefono": "", "web_oficial": "", "direccion": "",
        "poblacion": cat_match["poblacion"] if cat_match else "",
        "pais": cat_match["pais"] if cat_match else "",
        "preferente": cat_match["preferente"] if cat_match else False,
    })

enriched.sort(key=lambda x: -x["compras_historicas"])
(OUT / "proveedores_habituales_enriched.json").write_text(json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"proveedores_habituales_enriched.json: {len(enriched)} entradas")


# ---------------------------------------------------------------------------
# 6. MATERIALES INDEX
# ---------------------------------------------------------------------------
materiales_index = []
seen = set()
for r in codigos_sap:
    if r["material"] in seen:
        continue
    seen.add(r["material"])
    materiales_index.append({"codigo_sap": r["material"], "descripcion": r["descripcion"], "fuente": "catalogo"})
for sap, lista in sap_to_prov_clean.items():
    if sap in seen or not lista:
        continue
    desc = lista[0]["descripcion_historica"]
    if desc:
        seen.add(sap)
        materiales_index.append({"codigo_sap": sap, "descripcion": desc, "fuente": "historico"})
(OUT / "materiales_index.json").write_text(json.dumps(materiales_index, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"materiales_index.json: {len(materiales_index)} entradas")


# ---------------------------------------------------------------------------
# 7. STATS
# ---------------------------------------------------------------------------
stats = {
    "generado": datetime.now().isoformat(),
    "codigos_sap": len(codigos_sap),
    "proveedores_catalogo": len(proveedores_catalogo),
    "proveedores_habituales": len(prov_hab),
    "proveedores_enriched": len(enriched),
    "compras_historicas": len(df_h),
    "codigos_con_historial": len(sap_to_prov_clean),
    "proveedores_con_historial": len(prov_to_sap_clean),
    "rango_fechas": {
        "desde": df_h["fecha"].min().strftime("%Y-%m-%d") if pd.notna(df_h["fecha"].min()) else None,
        "hasta": df_h["fecha"].max().strftime("%Y-%m-%d") if pd.notna(df_h["fecha"].max()) else None,
    },
}
(OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# 8. COPIA a public/data/ (lo que la app sirve en runtime)
# ---------------------------------------------------------------------------
for fn in ["proveedores_habituales_enriched.json", "sap_to_proveedores.json", "stats.json"]:
    (PUB / fn).write_text((OUT / fn).read_text(encoding="utf-8"), encoding="utf-8")
for fn in ["codigos_sap.xlsx", "historico_compras.xlsx"]:
    src = RAW / fn
    if src.exists():
        (PUB / fn).write_bytes(src.read_bytes())

print()
print(json.dumps(stats, indent=2, ensure_ascii=False))
