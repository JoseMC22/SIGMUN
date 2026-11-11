export interface TipoValorOption {
  id_valor: string;
  nomb_val: string;
}

export interface ConstanciaExigibilidadValue {
  administrado: string;
  fecVal: string | null;
  monto: number;
  cargo: string;
  fNotifica: string | null;
  nroExigibilidad: string;
  fExigibilidad: string | null;
  codigo: string;
  idValor: string;
  anoVal: string;
  numVal: string;
}

export interface ValidarConstanciaExigibilidadData extends ConstanciaExigibilidadValue {
  canGenerate: boolean;
  canPrint: boolean;
  message: string;
}

export interface EmitirConstanciaExigibilidadData {
  numexig: string;
  anoexig: string;
}

export interface ImpresionConstanciaExigibilidadData {
  nombre: string;
  constancia: string;
  valor: string;
  fnotifica: string | null;
  cargo: string;
}

/** Canonical notifications-family envelope used by every endpoint. */
export interface ConstanciaExigibilidadResult<T> {
  success: boolean;
  data: T[];
  total: number;
  error?: string;
}

export type TipoValorComboResult =
  ConstanciaExigibilidadResult<TipoValorOption>;
export type ValidarConstanciaExigibilidadResult =
  ConstanciaExigibilidadResult<ValidarConstanciaExigibilidadData>;
export type EmitirConstanciaExigibilidadResult =
  ConstanciaExigibilidadResult<EmitirConstanciaExigibilidadData>;
export type ImpresionConstanciaExigibilidadResult =
  ConstanciaExigibilidadResult<ImpresionConstanciaExigibilidadData>;
