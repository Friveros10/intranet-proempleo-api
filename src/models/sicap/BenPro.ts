/** Tabla dbo.BENPRO (relación beneficiario-proyecto, legacy SICAP) */
export interface BenPro {
  ano_BenPro: number;
  mes_benpro: number;
  fol_pro: number;
  rut_ben: number;
  com_ben: number | null;
  cor_benpro: number;
  est_benpro: string | null;
  usu_cre: string | null;
  fec_cre: Date | null;
  usu_eli: string | null;
  fec_eli: Date | null;
  key_imp: string | null;
  usu_imp: string | null;
  fec_imp: Date | null;
  usu_apr: string | null;
  fec_apr: Date | null;
  sit_benpro: string | null;
  sit_fec: Date | null;
  sit_usu: string | null;
  dir_benpro: string | null;
  usu_mod: string | null;
  fec_mod: Date | null;
}
