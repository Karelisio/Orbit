import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface HomeSectionsVisibility {
  together: boolean;
  cycle: boolean;
  events: boolean;
  tasks: boolean;
}

const DEFAULT_HOME_SECTIONS: HomeSectionsVisibility = {
  together: true,
  cycle: true,
  events: true,
  tasks: true,
};

const HOME_SECTIONS_KEY = "orbit-home-sections";
const SHOW_PERIOD_KEY = "orbit-show-period-in-calendar";

interface PreferencesContextValue {
  homeSections: HomeSectionsVisibility;
  setHomeSectionVisible: (section: keyof HomeSectionsVisibility, visible: boolean) => void;
  showPeriodInCalendar: boolean;
  setShowPeriodInCalendar: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

/**
 * Préférences d'affichage propres à cet appareil (pas synchronisées entre
 * les deux comptes du couple, comme la taille d'UI sur Wenn) : stockées en
 * localStorage plutôt qu'en base, pas besoin de plus pour un simple réglage
 * d'affichage individuel.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [homeSections, setHomeSections] = useState<HomeSectionsVisibility>(() => {
    try {
      const stored = localStorage.getItem(HOME_SECTIONS_KEY);
      return stored ? { ...DEFAULT_HOME_SECTIONS, ...JSON.parse(stored) } : DEFAULT_HOME_SECTIONS;
    } catch {
      return DEFAULT_HOME_SECTIONS;
    }
  });

  const [showPeriodInCalendar, setShowPeriodInCalendarState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SHOW_PERIOD_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HOME_SECTIONS_KEY, JSON.stringify(homeSections));
    } catch {
      // stockage indisponible (navigation privée...) : la préférence ne persistera pas
    }
  }, [homeSections]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_PERIOD_KEY, String(showPeriodInCalendar));
    } catch {
      // idem
    }
  }, [showPeriodInCalendar]);

  function setHomeSectionVisible(section: keyof HomeSectionsVisibility, visible: boolean) {
    setHomeSections((prev) => ({ ...prev, [section]: visible }));
  }

  return (
    <PreferencesContext.Provider
      value={{ homeSections, setHomeSectionVisible, showPeriodInCalendar, setShowPeriodInCalendar: setShowPeriodInCalendarState }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences doit être utilisé dans PreferencesProvider");
  return ctx;
}
