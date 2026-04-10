import type { CSSProperties } from "react";
import { getCompanySettingsKey } from "@/lib/company-settings";
import type { IndustryCode, Language } from "@/types";

export type FieldAppFontId =
  | "geist"
  | "inter"
  | "ibm_plex_sans"
  | "manrope"
  | "plus_jakarta_sans"
  | "public_sans"
  | "source_sans_3"
  | "work_sans";
export type FieldAppShape = "square" | "small" | "medium" | "large";
export type FieldAppShadow = "none" | "subtle" | "strong";
export type FieldAppQuickActionId =
  | "report_incident"
  | "my_tasks"
  | "browse_assets"
  | "request_fix"
  | "scan_asset"
  | "risk_check"
  | "checklists"
  | "news";

export interface FieldAppSettings {
  quickActions: FieldAppQuickActionId[];
  newsEnabled: boolean;
  tipOfTheDayEnabled: boolean;
  fontId: FieldAppFontId;
  shape: FieldAppShape;
  shadow: FieldAppShadow;
}

export interface FieldAppQuickActionDefinition {
  id: FieldAppQuickActionId;
  href: string;
  labelKey: string;
  fallbackLabel: string;
}

type SupportedFieldAppLocale = Extract<Language, "en" | "es" | "de" | "fr" | "nl" | "sv">;

interface FieldTipDefinition {
  industries?: IndustryCode[];
  translations: Record<SupportedFieldAppLocale, string>;
}

export const FIELD_APP_MIN_QUICK_ACTIONS = 6;

export const FIELD_APP_FONT_OPTIONS: Array<{ value: FieldAppFontId; label: string }> = [
  { value: "geist", label: "Geist Sans" },
  { value: "inter", label: "Inter" },
  { value: "ibm_plex_sans", label: "IBM Plex Sans" },
  { value: "manrope", label: "Manrope" },
  { value: "plus_jakarta_sans", label: "Plus Jakarta Sans" },
  { value: "public_sans", label: "Public Sans" },
  { value: "source_sans_3", label: "Source Sans 3" },
  { value: "work_sans", label: "Work Sans" },
];

export const FIELD_APP_SHAPE_OPTIONS: Array<{ value: FieldAppShape; label: string }> = [
  { value: "square", label: "Square" },
  { value: "small", label: "Small radius" },
  { value: "medium", label: "Medium radius" },
  { value: "large", label: "Large radius" },
];

export const FIELD_APP_SHADOW_OPTIONS: Array<{ value: FieldAppShadow; label: string }> = [
  { value: "none", label: "No shadows" },
  { value: "subtle", label: "Subtle shadows" },
  { value: "strong", label: "Strong shadows" },
];

export const FIELD_APP_QUICK_ACTION_DEFINITIONS: FieldAppQuickActionDefinition[] = [
  { id: "report_incident", href: "/app/report", labelKey: "app.reportIncident", fallbackLabel: "Report Incident" },
  { id: "my_tasks", href: "/app/checklists", labelKey: "app.myTasks", fallbackLabel: "My Tasks" },
  { id: "browse_assets", href: "/app/assets", labelKey: "app.browseAssets", fallbackLabel: "Browse Assets" },
  { id: "request_fix", href: "/app/maintenance", labelKey: "app.requestFix", fallbackLabel: "Request Fix" },
  { id: "scan_asset", href: "/app/scan", labelKey: "app.scanAsset", fallbackLabel: "Scan Asset" },
  { id: "risk_check", href: "/app/checklists?tab=risk-assessment", labelKey: "app.riskAssessment", fallbackLabel: "Risk Check" },
  { id: "checklists", href: "/app/checklists", labelKey: "nav.safety", fallbackLabel: "Checklists" },
  { id: "news", href: "/app/news", labelKey: "nav.news", fallbackLabel: "News" },
];

export const FIELD_APP_QUICK_ACTION_IDS = FIELD_APP_QUICK_ACTION_DEFINITIONS.map((action) => action.id);

const FIELD_APP_DEFAULT_PRESET: FieldAppQuickActionId[] = [
  "report_incident",
  "my_tasks",
  "risk_check",
  "browse_assets",
];

const FIELD_APP_PRESETS: Partial<Record<IndustryCode, FieldAppQuickActionId[]>> = {
  healthcare: ["my_tasks", "report_incident", "checklists", "risk_check", "news", "browse_assets"],
  manufacturing: ["my_tasks", "scan_asset", "browse_assets", "request_fix", "report_incident", "risk_check"],
  warehousing: ["my_tasks", "scan_asset", "browse_assets", "request_fix", "report_incident", "checklists"],
  airports: ["my_tasks", "report_incident", "scan_asset", "checklists", "news", "browse_assets"],
  transportation: ["my_tasks", "scan_asset", "browse_assets", "report_incident", "checklists", "request_fix"],
  construction: ["my_tasks", "report_incident", "request_fix", "risk_check", "checklists", "browse_assets"],
  utilities: ["my_tasks", "request_fix", "scan_asset", "risk_check", "browse_assets", "checklists"],
  food_beverage: ["my_tasks", "checklists", "report_incident", "risk_check", "news", "browse_assets"],
  education: ["my_tasks", "checklists", "news", "report_incident", "browse_assets", "request_fix"],
  mining: ["my_tasks", "report_incident", "request_fix", "scan_asset", "risk_check", "browse_assets"],
  oil_gas: ["my_tasks", "report_incident", "request_fix", "scan_asset", "risk_check", "browse_assets"],
};

const FIELD_APP_TIPS: FieldTipDefinition[] = [
  {
    translations: {
      en: "Report near-misses early so they can be corrected before someone gets hurt.",
      es: "Reporta los cuasi accidentes pronto para corregirlos antes de que alguien se lesione.",
      de: "Melde Beinaheunfaelle fruehzeitig, damit sie behoben werden koennen, bevor jemand verletzt wird.",
      fr: "Signalez rapidement les quasi-accidents afin de les corriger avant qu'une personne ne soit blessee.",
      nl: "Meld bijna-ongevallen vroeg zodat ze kunnen worden opgelost voordat iemand gewond raakt.",
      sv: "Rapportera tillbud tidigt sa att de kan atgardas innan nagon skadas.",
    },
  },
  {
    translations: {
      en: "If something feels unsafe, pause the job and ask for help before continuing.",
      es: "Si algo parece inseguro, detén el trabajo y pide ayuda antes de continuar.",
      de: "Wenn sich etwas unsicher anfuehlt, stoppe die Arbeit und hole Hilfe, bevor du weitermachst.",
      fr: "Si quelque chose semble dangereux, arretez le travail et demandez de l'aide avant de continuer.",
      nl: "Als iets onveilig voelt, stop dan het werk en vraag om hulp voordat je doorgaat.",
      sv: "Om nagot kanns osakert, stoppa arbetet och be om hjalp innan du fortsatter.",
    },
  },
  {
    translations: {
      en: "Keep walkways, exits, and access points clear throughout the shift.",
      es: "Mantén despejados los pasillos, salidas y puntos de acceso durante todo el turno.",
      de: "Halte Laufwege, Ausgaenge und Zugangsbereiche waehrend der gesamten Schicht frei.",
      fr: "Gardez les allees, les sorties et les points d'acces degages pendant tout le quart.",
      nl: "Houd looproutes, uitgangen en toegangspunten de hele dienst vrij.",
      sv: "Håll gångvägar, utgångar och åtkomstpunkter fria under hela passet.",
    },
  },
  {
    industries: ["healthcare"],
    translations: {
      en: "Confirm hand hygiene, sharps disposal, and patient-lift support before each clinical task.",
      es: "Confirma la higiene de manos, la eliminación de objetos punzantes y el apoyo para mover pacientes antes de cada tarea clínica.",
      de: "Pruefe vor jeder klinischen Aufgabe Handhygiene, Entsorgung von Kanuelen und Hilfen zum Patiententransfer.",
      fr: "Verifiez l'hygiene des mains, l'elimination des objets piquants et l'assistance au levage des patients avant chaque tache clinique.",
      nl: "Controleer handhygiëne, afvoer van scherpe materialen en hulpmiddelen voor patientverplaatsing voor elke klinische taak.",
      sv: "Kontrollera handhygien, hantering av stickande avfall och stöd vid patientforflyttning före varje klinisk uppgift.",
    },
  },
  {
    industries: ["manufacturing"],
    translations: {
      en: "Verify guards, lockout steps, and tool condition before restarting any production line.",
      es: "Verifica los resguardos, los pasos de bloqueo y el estado de las herramientas antes de reiniciar cualquier línea de producción.",
      de: "Pruefe Schutzvorrichtungen, Lockout-Schritte und Werkzeugzustand, bevor eine Produktionslinie neu gestartet wird.",
      fr: "Verifiez les protections, les etapes de consignation et l'etat des outils avant de redemarrer une ligne de production.",
      nl: "Controleer beveiligingen, lockout-stappen en de staat van gereedschap voordat een productielijn opnieuw start.",
      sv: "Kontrollera skydd, lockout-steg och verktygens skick innan en produktionslinje startas om.",
    },
  },
  {
    industries: ["warehousing"],
    translations: {
      en: "Check forklift lanes, dock edges, and load stability before moving pallets.",
      es: "Revisa los carriles de montacargas, los bordes del muelle y la estabilidad de la carga antes de mover palés.",
      de: "Pruefe Staplerwege, Rampenkanten und Ladungsstabilitaet, bevor Paletten bewegt werden.",
      fr: "Controlez les voies de chariot elevateur, les bords de quai et la stabilite des charges avant de deplacer des palettes.",
      nl: "Controleer heftruckroutes, laadranden en ladingstabiliteit voordat pallets worden verplaatst.",
      sv: "Kontrollera truckbanor, lastrampens kanter och lastens stabilitet innan pallar flyttas.",
    },
  },
  {
    industries: ["airports"],
    translations: {
      en: "Complete your FOD check and confirm ramp visibility before entering the apron.",
      es: "Completa tu revisión de FOD y confirma la visibilidad en la rampa antes de entrar en la plataforma.",
      de: "Fuehre deinen FOD-Check durch und bestaetige die Sichtverhaeltnisse auf dem Vorfeld, bevor du es betrittst.",
      fr: "Effectuez votre controle FOD et verifiez la visibilite sur l'aire de trafic avant d'y entrer.",
      nl: "Voer je FOD-controle uit en bevestig het zicht op het platform voordat je het betreedt.",
      sv: "Genomfor din FOD-kontroll och bekrafta sikten pa rampen innan du gar ut pa plattan.",
    },
  },
  {
    industries: ["construction"],
    translations: {
      en: "Inspect fall protection, scaffold access, and permit controls before starting elevated work.",
      es: "Inspecciona la protección contra caídas, el acceso al andamio y los controles de permisos antes de empezar trabajos en altura.",
      de: "Pruefe Absturzsicherung, Geruestzugang und Genehmigungskontrollen, bevor Arbeiten in der Hoehe beginnen.",
      fr: "Inspectez la protection contre les chutes, l'acces aux echafaudages et les controles de permis avant de commencer un travail en hauteur.",
      nl: "Inspecteer valbeveiliging, steiger-toegang en vergunningcontroles voordat werk op hoogte begint.",
      sv: "Inspektera fallskydd, stallningsatkomst och tillstandskontroller innan arbete pa hojd paborjas.",
    },
  },
  {
    industries: ["transportation"],
    translations: {
      en: "Finish the walk-around inspection and secure the load before departure.",
      es: "Termina la inspección perimetral y asegura la carga antes de salir.",
      de: "Schliesse die Rundumkontrolle ab und sichere die Ladung vor der Abfahrt.",
      fr: "Terminez l'inspection du vehicule et securisez la charge avant le depart.",
      nl: "Rond de voertuigcontrole af en zet de lading vast voordat je vertrekt.",
      sv: "Slutfor fordonskontrollen och sakerstall lasten innan avfard.",
    },
  },
  {
    industries: ["utilities"],
    translations: {
      en: "Confirm isolation, test-for-dead, and arc-flash protection before energised work begins.",
      es: "Confirma el aislamiento, verifica ausencia de tensión y la protección contra arco eléctrico antes de comenzar trabajos energizados.",
      de: "Bestaetige Freischaltung, Spannungspruefung und Störlichtbogenschutz, bevor Arbeiten an unter Spannung stehenden Anlagen beginnen.",
      fr: "Confirmez la consignation, le test d'absence de tension et la protection contre l'arc electrique avant tout travail sous tension.",
      nl: "Bevestig isolatie, spanningsloosheid en boogflitsbescherming voordat werk aan spanning begint.",
      sv: "Bekrafta fran-koppling, spanningsprovning och ljusbageskydd innan arbete pa spanningssatta delar borjar.",
    },
  },
  {
    industries: ["food_beverage"],
    translations: {
      en: "Verify temperature logs, allergen separation, and hygiene checks before production starts.",
      es: "Verifica los registros de temperatura, la separación de alérgenos y los controles de higiene antes de iniciar la producción.",
      de: "Pruefe Temperaturprotokolle, Allergen-Trennung und Hygienekontrollen vor Produktionsbeginn.",
      fr: "Verifiez les releves de temperature, la separation des allergenes et les controles d'hygiene avant le debut de la production.",
      nl: "Controleer temperatuurlogboeken, allergeenscheiding en hygienecontroles voordat de productie start.",
      sv: "Kontrollera temperaturloggar, allergenseparation och hygienkontroller innan produktionen startar.",
    },
  },
  {
    industries: ["education"],
    translations: {
      en: "Check visitor controls, classroom exits, and safeguarding procedures at the start of the day.",
      es: "Revisa el control de visitantes, las salidas del aula y los procedimientos de protección al inicio del día.",
      de: "Pruefe Besucherkontrollen, Klassenraumausgaenge und Schutzverfahren zu Beginn des Tages.",
      fr: "Verifiez le controle des visiteurs, les sorties de salle et les procedures de protection au debut de la journee.",
      nl: "Controleer bezoekersbeheer, uitgangen van lokalen en veiligheidsprocedures aan het begin van de dag.",
      sv: "Kontrollera besokskontroller, klassrumsutgangar och skyddsprocedurer i borjan av dagen.",
    },
  },
  {
    industries: ["mining"],
    translations: {
      en: "Confirm ventilation, ground conditions, and emergency comms before entering the work area.",
      es: "Confirma la ventilación, las condiciones del terreno y las comunicaciones de emergencia antes de entrar al área de trabajo.",
      de: "Bestaetige Belueftung, Bodenbedingungen und Notfallkommunikation, bevor du den Arbeitsbereich betrittst.",
      fr: "Confirmez la ventilation, l'etat du terrain et les communications d'urgence avant d'entrer dans la zone de travail.",
      nl: "Bevestig ventilatie, bodemomstandigheden en noodcommunicatie voordat je het werkgebied betreedt.",
      sv: "Bekrafta ventilation, markforhallanden och nodkommunikation innan du gar in i arbetsomradet.",
    },
  },
  {
    industries: ["oil_gas"],
    translations: {
      en: "Verify gas detection, permit-to-work status, and ignition controls before starting the task.",
      es: "Verifica la detección de gases, el estado del permiso de trabajo y los controles de ignición antes de iniciar la tarea.",
      de: "Pruefe Gasdetektion, Freigabestatus und Zuendquellenkontrollen, bevor die Aufgabe beginnt.",
      fr: "Verifiez la detection de gaz, le statut du permis de travail et les controles des sources d'ignition avant de commencer la tache.",
      nl: "Controleer gasdetectie, werkvergunningstatus en ontstekingsbroncontroles voordat de taak start.",
      sv: "Kontrollera gasdetektering, arbetstillstand och antandningskontroller innan uppgiften startar.",
    },
  },
];

export function getFieldAppQuickActionDefinition(id: FieldAppQuickActionId) {
  return FIELD_APP_QUICK_ACTION_DEFINITIONS.find((action) => action.id === id) ?? FIELD_APP_QUICK_ACTION_DEFINITIONS[0];
}

export function buildDefaultFieldAppSettings(industry?: IndustryCode | null): FieldAppSettings {
  const preset = FIELD_APP_PRESETS[industry ?? "construction"] ?? FIELD_APP_DEFAULT_PRESET;
  return {
    quickActions: [...preset],
    newsEnabled: true,
    tipOfTheDayEnabled: true,
    fontId: "geist",
    shape: "medium",
    shadow: "none",
  };
}

export function normalizeFieldAppSettings(
  input: Partial<FieldAppSettings> | undefined,
  industry?: IndustryCode | null
): FieldAppSettings {
  const defaults = buildDefaultFieldAppSettings(industry);
  const normalizedFontId = normalizeFieldAppFontId(input?.fontId);
  const normalizedShape = normalizeFieldAppShape(input?.shape);
  const normalizedShadow = normalizeFieldAppShadow(input?.shadow);
  const merged: FieldAppSettings = {
    ...defaults,
    ...input,
    fontId: normalizedFontId ?? defaults.fontId,
    shape: normalizedShape ?? defaults.shape,
    shadow: normalizedShadow ?? defaults.shadow,
  };

  const uniqueQuickActions = Array.from(
    new Set((merged.quickActions ?? []).filter((id): id is FieldAppQuickActionId => FIELD_APP_QUICK_ACTION_IDS.includes(id)))
  );

  const availableActions = merged.newsEnabled
    ? FIELD_APP_QUICK_ACTION_IDS
    : FIELD_APP_QUICK_ACTION_IDS.filter((id) => id !== "news");

  const seededActions = uniqueQuickActions.filter((id) => availableActions.includes(id));
  const nextQuickActions = [...seededActions];
  for (const candidate of availableActions) {
    if (nextQuickActions.length >= FIELD_APP_MIN_QUICK_ACTIONS) {
      break;
    }
    if (!nextQuickActions.includes(candidate)) {
      nextQuickActions.push(candidate);
    }
  }

  return {
    ...merged,
    quickActions: nextQuickActions,
  };
}

export function getFieldAppFontStack(fontId: FieldAppFontId): string {
  switch (fontId) {
    case "inter":
      return "var(--font-inter), system-ui, sans-serif";
    case "ibm_plex_sans":
      return "var(--font-ibm-plex-sans), system-ui, sans-serif";
    case "manrope":
      return "var(--font-manrope), system-ui, sans-serif";
    case "plus_jakarta_sans":
      return "var(--font-plus-jakarta-sans), system-ui, sans-serif";
    case "public_sans":
      return "var(--font-public-sans), system-ui, sans-serif";
    case "source_sans_3":
      return "var(--font-source-sans-3), system-ui, sans-serif";
    case "work_sans":
      return "var(--font-work-sans), system-ui, sans-serif";
    case "geist":
    default:
      return "var(--font-geist-sans), system-ui, sans-serif";
  }
}

export function getFieldAppRadiusValue(shape: FieldAppShape): string {
  switch (shape) {
    case "square":
      return "0px";
    case "small":
      return "0.375rem";
    case "large":
      return "1rem";
    case "medium":
    default:
      return "0.75rem";
  }
}

export function getFieldAppShellStyle(settings: FieldAppSettings): CSSProperties {
  return {
    "--radius": getFieldAppRadiusValue(settings.shape),
    "--field-app-font-family": getFieldAppFontStack(settings.fontId),
  } as CSSProperties;
}

export function getFieldAppTip(
  industry: IndustryCode | null | undefined,
  language: Language | null | undefined,
  daySeed: number
): string {
  const locale = normalizeFieldAppLocale(language);
  const matchingTips = FIELD_APP_TIPS.filter((tip) => !tip.industries || tip.industries.includes(industry ?? "construction"));
  const tips = matchingTips.length > 0 ? matchingTips : FIELD_APP_TIPS;
  const index = ((daySeed % tips.length) + tips.length) % tips.length;
  return tips[index].translations[locale];
}

export function readStoredFieldAppSettings(
  companyId: string | null | undefined,
  industry?: IndustryCode | null
): FieldAppSettings {
  if (typeof window === "undefined" || !companyId) {
    return buildDefaultFieldAppSettings(industry);
  }

  const raw = window.localStorage.getItem(getCompanySettingsKey(companyId));
  if (!raw) {
    return buildDefaultFieldAppSettings(industry);
  }

  try {
    const parsed = JSON.parse(raw) as { fieldApp?: Partial<FieldAppSettings> };
    return normalizeFieldAppSettings(parsed.fieldApp, industry);
  } catch {
    return buildDefaultFieldAppSettings(industry);
  }
}

function normalizeFieldAppLocale(language?: Language | null): SupportedFieldAppLocale {
  if (language === "de" || language === "es" || language === "fr" || language === "nl" || language === "sv") {
    return language;
  }
  return "en";
}

function normalizeFieldAppFontId(fontId?: string): FieldAppFontId | undefined {
  const nextFontId = FIELD_APP_FONT_OPTIONS.find((option) => option.value === fontId)?.value;
  if (nextFontId) {
    return nextFontId;
  }

  if (fontId === "system") return "inter";
  if (fontId === "arial") return "public_sans";
  if (fontId === "trebuchet") return "work_sans";

  return undefined;
}

function normalizeFieldAppShape(shape?: string): FieldAppShape | undefined {
  return FIELD_APP_SHAPE_OPTIONS.find((option) => option.value === shape)?.value;
}

function normalizeFieldAppShadow(shadow?: string): FieldAppShadow | undefined {
  return FIELD_APP_SHADOW_OPTIONS.find((option) => option.value === shadow)?.value;
}
