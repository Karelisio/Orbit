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

export type NavTab = "calendar" | "tasks" | "budget" | "journal";

export const NAV_TAB_LABELS: Record<NavTab, string> = {
  calendar: "Calendrier",
  tasks: "Tâches",
  budget: "Budget",
  journal: "Journal",
};

export type NavTabsVisibility = Record<NavTab, boolean>;

const DEFAULT_NAV_TABS: NavTabsVisibility = {
  calendar: true,
  tasks: true,
  budget: true,
  journal: true,
};

const HOME_SECTIONS_KEY = "orbit-home-sections";
const SHOW_PERIOD_KEY = "orbit-show-period-in-calendar";
const SHOW_PERIOD_WIDGET_KEY = "orbit-show-period-in-widget";
const NAV_TABS_KEY = "orbit-nav-tabs";

interface PreferencesContextValue {
  homeSections: HomeSectionsVisibility;
  setHomeSectionVisible: (section: keyof HomeSectionsVisibility, visible: boolean) => void;
  showPeriodInCalendar: boolean;
  setShowPeriodInCalendar: (value: boolean) => void;
  showPeriodInWidget: boolean;
  setShowPeriodInWidget: (value: boolean) => void;
  navTabs: NavTabsVisibility;
  setNavTabVisible: (tab: NavTab, visible: boolean) => void;
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

  const [showPeriodInWidget, setShowPeriodInWidgetState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SHOW_PERIOD_WIDGET_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const [navTabs, setNavTabs] = useState<NavTabsVisibility>(() => {
    try {
      const stored = localStorage.getItem(NAV_TABS_KEY);
      return stored ? { ...DEFAULT_NAV_TABS, ...JSON.parse(stored) } : DEFAULT_NAV_TABS;
    } catch {
      return DEFAULT_NAV_TABS;
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

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_PERIOD_WIDGET_KEY, String(showPeriodInWidget));
    } catch {
      // idem
    }
  }, [showPeriodInWidget]);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_TABS_KEY, JSON.stringify(navTabs));
    } catch {
      // idem
    }
  }, [navTabs]);

  function setHomeSectionVisible(section: keyof HomeSectionsVisibility, visible: boolean) {
    setHomeSections((prev) => ({ ...prev, [section]: visible }));
  }

  function setNavTabVisible(tab: NavTab, visible: boolean) {
    setNavTabs((prev) => ({ ...prev, [tab]: visible }));
  }

  return (
    <PreferencesContext.Provider
      value={{
        homeSections,
        setHomeSectionVisible,
        showPeriodInCalendar,
        setShowPeriodInCalendar: setShowPeriodInCalendarState,
        showPeriodInWidget,
        setShowPeriodInWidget: setShowPeriodInWidgetState,
        navTabs,
        setNavTabVisible,
      }}
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
