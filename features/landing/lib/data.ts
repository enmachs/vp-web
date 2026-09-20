export interface CountryCode {
  code: string;
  label: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+58',  label: '🇻🇪 +58'  },
  { code: '+1',   label: '🇺🇸 +1'   },
  { code: '+52',  label: '🇲🇽 +52'  },
  { code: '+57',  label: '🇨🇴 +57'  },
  { code: '+507', label: '🇵🇦 +507' },
  { code: '+34',  label: '🇪🇸 +34'  },
  { code: '+54',  label: '🇦🇷 +54'  },
  { code: '+55',  label: '🇧🇷 +55'  },
  { code: '+56',  label: '🇨🇱 +56'  },
  { code: '+51',  label: '🇵🇪 +51'  },
  { code: '+593', label: '🇪🇨 +593' },
  { code: '+591', label: '🇧🇴 +591' },
  { code: '+598', label: '🇺🇾 +598' },
  { code: '+44',  label: '🇬🇧 +44'  },
  { code: '+33',  label: '🇫🇷 +33'  },
  { code: '+49',  label: '🇩🇪 +49'  },
];

// Used server-side to whitelist the phoneCode field
export const VALID_PHONE_CODES = new Set(COUNTRY_CODES.map((c) => c.code));
