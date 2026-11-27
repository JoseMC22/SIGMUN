export interface ObraComplementariaKey {
  id_instala: string;
  anno: string;
  categ: string | null;
}

export interface ObraComplementariaData {
  instala: string;
  uni_med: string;
  valor: number;
  descri_gener: string;
}

export interface ObraComplementariaRow
  extends ObraComplementariaKey,
    ObraComplementariaData {
  nestado: number;
  vhostnm: string;
  vusernm: string;
  ddatetm: string | Date;
}

export interface SaveObraComplementariaPayload
  extends ObraComplementariaKey,
    ObraComplementariaData {}

export function toObraComplementariaKey(
  row: ObraComplementariaKey,
): ObraComplementariaKey {
  return {
    id_instala: row.id_instala,
    anno: row.anno,
    categ: row.categ?.trim() || null,
  };
}
