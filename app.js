/*
  Plik app.js zmodyfikowany zgodnie z prośbą:
  - Zastąpiono symulację storage (storageData) prawdziwym `localStorage`.
  - Usunięto całą logikę związaną z "Wyzwaniem 10-dni" (renderPlan, toggleDay, resetPlan, updateStreak).
  - Uproszczono logikę quizu: odblokowuje się po pierwszym audycie, a nie po zdobyciu punktów "Platinum".
  - Uproszczono metryki na pulpicie, aby odzwierciedlały stan jednorazowy.
  - Zmieniono nawigację (CTA kieruje do audytu, strona po audycie kieruje do pulpitu).
  
  ZMIANY z 2025-11-06 (na podstawie prośby):
  - Logika quizu wymaga teraz Audytu + 5 Ćwiczeń + Przeczytania wszystkich artykułów.
  - Artykuły edukacyjne mają 15-sekundowy timer do zaliczenia.
  - Dodano funkcję eksportu samych zaleceń po audycie.
*/

// Application state
const state = {
  userName: '',
  currentSection: 'dashboard',
  auditHistory: [],
  currentAudit: null,
  completedExercises: [],
  readArticles: [],
  unlockedBadges: [],
  points: 0,
  streak: 0, // Logika streaka została usunięta, ale pole zostaje
  lastActivityDate: null,
  sidebarOpen: false,
  quizCompleted: false,
  quizBonusAwarded: false,
  
  // Audit sections data
  auditSections: [
    {
      id: 1,
      title: "Krzesło i ustawienie ciała",
      icon: "fas fa-chair",
      weight: 25,
      healthRisk: "krzeslo",
      questions: [
        { id: "k1", text: "Stopy w pełni oparte o podłogę; w razie potrzeby podnóżek/podstawka", checked: false, weight: 6.25, healthRisk: "krzeslo" },
        { id: "k2", text: "Uda równolegle do podłogi; kąt w kolanach ok. 90°", checked: false, weight: 6.25, healthRisk: "krzeslo" },
        { id: "k3", text: "Oparcie z wyczuwalnym podparciem lędźwi", checked: false, weight: 6.25, healthRisk: "krzeslo" },
        { id: "k4", text: "Podłokietniki na poziomie blatu; barki rozluźnione; nadgarstki w osi", checked: false, weight: 6.25, healthRisk: "krzeslo" }
      ]
    },
    {
      id: 2,
      title: "Monitor",
      icon: "fas fa-desktop",
      weight: 20,
      healthRisk: "monitor",
      questions: [
        { id: "m1", text: "Górna krawędź ekranu na wysokości oczu (lub nieco niżej), odległość 50–70 cm", checked: false, weight: 6.67, healthRisk: "monitor" },
        { id: "m2", text: "Ekran lekko odchylony (10–20°) i ustawiony na wprost", checked: false, weight: 6.67, healthRisk: "monitor" },
        { id: "m3", text: "Źródło światła dziennego pada z boku (bez olśnień i odbić)", checked: false, weight: 6.66, healthRisk: "monitor" }
      ]
    },
    {
      id: 3,
      title: "Klawiatura i mysz",
      icon: "fas fa-keyboard",
      weight: 15,
      healthRisk: "klawiatura_mysz",
      questions: [
        { id: "km1", text: "Klawiatura na wysokości łokci; nadgarstki prosto", checked: false, weight: 7.5, healthRisk: "klawiatura_mysz" },
        { id: "km2", text: "Mysz blisko klawiatury, na tej samej wysokości", checked: false, weight: 7.5, healthRisk: "klawiatura_mysz" }
      ]
    },
    {
      id: 4,
      title: "Postawa ciała",
      icon: "fas fa-user",
      weight: 10,
      healthRisk: "postawa",
      questions: [
        { id: "p1", text: "Plecy prosto; barki rozluźnione", checked: false, weight: 5, healthRisk: "postawa" },
        { id: "p2", text: "Głowa w naturalnej pozycji (nie wysunięta do przodu)", checked: false, weight: 5, healthRisk: "postawa" }
      ]
    },
    {
      id: 5,
      title: "Praca z dwoma monitorami",
      icon: "fas fa-tv",
      weight: 10,
      healthRisk: "2monitory",
      hasMode: true,
      mode: "na",
      questions: [],
      symmetricQuestions: [
        { id: "2m_s1", text: "Krawędzie monitorów stykają się na środku pola widzenia", checked: false, weight: 2.5, healthRisk: "2monitory" },
        { id: "2m_s2", text: "Ta sama wysokość; górna krawędź na wysokości wzroku lub trochę poniżej", checked: false, weight: 2.5, healthRisk: "2monitory" },
        { id: "2m_s3", text: "Nachylenie 10–20° i lekko do środka (jak skrzydła książki)", checked: false, weight: 2.5, healthRisk: "2monitory" },
        { id: "2m_s4", text: "Krzesło ustawione pośrodku między monitorami", checked: false, weight: 2.5, healthRisk: "2monitory" }
      ],
      mixedQuestions: [
        { id: "2m_m1", text: "Główny monitor ustawiony na wprost", checked: false, weight: 3.34, healthRisk: "2monitory" },
        { id: "2m_m2", text: "Pomocniczy z boku, pod kątem; bez skręcania tułowia", checked: false, weight: 3.33, healthRisk: "2monitory" },
        { id: "2m_m3", text: "Zmieniasz stronę monitora pomocniczego co kilka dni", checked: false, weight: 3.33, healthRisk: "2monitory" }
      ]
    },
    {
      id: 6,
      title: "Praca z laptopem",
      icon: "fas fa-laptop",
      weight: 10,
      healthRisk: "laptop",
      hasApplies: true,
      applies: false,
      questions: [
        { id: "l1", text: "Używam podstawki pod laptopa oraz zewnętrznej klawiatury i myszy", checked: false, weight: 5, healthRisk: "laptop" },
        { id: "l2", text: "Otwory wentylacyjne laptopa nie są zasłonięte", checked: false, weight: 5, healthRisk: "laptop" }
      ]
    },
    {
      id: 7,
      title: "Mikroprzerwy i pro-tipy",
      icon: "fas fa-clock",
      weight: 10,
      healthRisk: "mikroprzerwy",
      questions: [
        { id: "mp1", text: "Krótkie, aktywne przerwy co 30–40 minut", checked: false, weight: 3.34, healthRisk: "mikroprzerwy" },
        { id: "mp2", text: "Kosz na śmieci ustawiony dalej od biurka (zachęca do wstania)", checked: false, weight: 3.33, healthRisk: "mikroprzerwy" },
        { id: "mp3", text: "Podczas rozmów tel. bez komputera — wstaję i robię krótki spacer (walk-and-talk)", checked: false, weight: 3.33, healthRisk: "mikroprzerwy" }
      ]
    }
  ],
  
  // Health consequences mapping
  healthConsequences: {
    krzeslo: {
      name: "Problemy z krzesłem i wysokością",
      urgency: "high",
      icon: "fas fa-chair",
      color: "var(--color-orange-500)",
      effects: [
        "Bóle pleców i kręgosłupa (72% pracowników)",
        "Żylaki i obrzęki nóg (20%)",
        "Ograniczony przepływ krwi",
        "Chroniczne zapalenie stawów"
      ],
      actionItems: [
        "Wymień/wyreguluj krzesło",
        "Dodaj podnóżek",
        "Ćwiczenie: Rozciąganie pleców"
      ]
    },
    monitor: {
      name: "Problemy z monitorem",
      urgency: "high",
      icon: "fas fa-desktop",
      color: "var(--color-orange-500)",
      effects: [
        "Bóle karku i szyi (51% pracowników)",
        "Zaburzenia wzroku (60%)",
        "Bóle głowy i migreny (47%)",
        "Zmęczenie oczu"
      ],
      actionItems: [
        "Podnieś monitor na podstawkę",
        "Dostosuj oświetlenie",
        "Ćwiczenie: Palming i ruchy oczu"
      ]
    },
    klawiatura_mysz: {
      name: "Problemy z klawiaturą i myszą",
      urgency: "high",
      icon: "fas fa-keyboard",
      color: "var(--color-orange-500)",
      effects: [
        "Zespół cieśni nadgarstka (15% pracowników)",
        "Bóle ramion i przedramienia",
        "Zapalenie ścięgien",
        "Chroniczny ból nadgarstka"
      ],
      actionItems: [
        "Przysuń mysz do klawiatury",
        "Dodaj podpórkę pod nadgarstki",
        "Ćwiczenie: Rozciąganie nadgarstków"
      ]
    },
    postawa: {
      name: "Problemy z postawą ciała",
      urgency: "high",
      icon: "fas fa-user",
      color: "var(--color-orange-500)",
      effects: [
        "Bóle szyi i karku (51%)",
        "Chroniczne napięcie mięśni",
        "Chroniczne migreny",
        "Skolioza i zaburzenia kręgosłupa"
      ],
      actionItems: [
        "Pamiętaj o naturalnej pozycji głowy",
        "Rozluźniaj barki regularnie",
        "Ćwiczenie: Rotacja szyi i ramion"
      ]
    },
    "2monitory": {
      name: "Asymetryczne ustawienie monitorów",
      urgency: "medium",
      icon: "fas fa-tv",
      color: "var(--color-yellow-500)",
      effects: [
        "Bóle szyi i pleców",
        "Asymetryczne obciążenie mięśni",
        "Skolioza (krzywe boki)",
        "Chroniczne bóle jednostronne"
      ],
      actionItems: [
        "Wyrównaj wysokość monitorów",
        "Ustaw monitory symetrycznie",
        "Ćwiczenie: Rotacja ramion"
      ]
    },
    laptop: {
      name: "Brak właściwego setupu laptopa",
      urgency: "critical",
      icon: "fas fa-laptop",
      color: "var(--color-red-500)",
      effects: [
        "Poważne bóle szyi i pleców",
        "Zespół cieśni nadgarstka (natychmiast)",
        "Chroniczne problemy ze wzrokiem",
        "Długoterminowe uszkodzenia zdrowotne"
      ],
      actionItems: [
        "NATYCHMIAST: Kup podstawkę pod laptopa",
        "Podłącz zewnętrzną klawiaturę i mysz",
        "To jest PRIORYTET!"
      ]
    },
    mikroprzerwy: {
      name: "Brak przerw i ruchu",
      urgency: "critical",
      icon: "fas fa-clock",
      color: "var(--color-red-500)",
      effects: [
        "Stres chroniczny (81% pracowników)",
        "Zwiększone ryzyko chorób serca (30%)",
        "Zmęczenie i depresja (45%)",
        "Zaburzenia snu (20%)"
      ],
      actionItems: [
        "Ustaw timer na co 30 minut",
        "Rób krótkie spacery",
        "Wykonuj ćwiczenia rozluźniające"
      ]
    }
  },
  
  // USUNIĘTO: challenges (plan 10-dniowy)
  
  // Exercises data (pozostaje bez zmian)
  exercises: {
    neckShoulders: {
      title: "Szyja i ramiona",
      icon: "fas fa-head-side-virus",
      exercises: [
        { name: "Rotacja szyi", duration: 45, description: "Obracaj głowę powoli w lewo i prawo, zatrzymując się na koniec zakresu na 3 sekundy. Powtórz 5 razy w każdą stronę." },
        { name: "Pochylanie szyi", duration: 45, description: "Pochylaj głowę do przodu, aż poczujesz napięcie w karku. Zatrzymaj na 5 sekund, potem do tyłu. Powtórz 5 razy." },
        { name: "Rotacja ramion", duration: 60, description: "Podnieś ramiona do uszu i obracaj je wstecz 10 razy, potem naprzód 10 razy. Powoli i kontrolowanie." },
        { name: "Rozciąganie boku szyi", duration: 60, description: "Pochyl głowę do prawego ramienia, zatrzymaj 15 sekund. Powtórz po lewej stronie." }
      ]
    },
    back: {
      title: "Plecy",
      icon: "fas fa-person-hiking",
      exercises: [
        { name: "Rozciąganie pleców", duration: 60, description: "Wstań, połóż dłonie za siebie i obracaj tułów powoli do przodu. Zatrzymaj na 15 sekund. Powtórz 3 razy." },
        { name: "Cat-cow stretch", duration: 90, description: "Stoi na czworaka. Wygib plecy do przodu, zatrzymaj 5 sekund. Potem zaokrąglij plecy, zatrzymaj 5 sekund. Powtórz 8 razy." },
        { name: "Pochylenie do przodu", duration: 75, description: "Stoi, nogi na szerokości bioder. Pochylaj się do przodu, starając się dotknąć palcami podłogi. Zatrzymaj 20 sekund." },
        { name: "Wyprost klatki piersiowej", duration: 60, description: "Stoi prosto, spłoć dłonie za plecami. Powoli podnosi ramiona do tyłu. Zatrzymaj 15 sekund. Powtórz 3 razy." }
      ]
    },
    wrists: {
      title: "Nadgarstki i dłonie",
      icon: "fas fa-hand-fist",
      exercises: [
        { name: "Rotacja nadgarstka", duration: 30, description: "Wyciągnij rękę do przodu, otwórz i zamykaj dłoń. Obracaj nadgarstkiem w kółko 10 razy w każdą stronę." },
        { name: "Rozciąganie palców", duration: 45, description: "Spłoć dłonie za sobą, przymknij oczy i powoli podnies ręce w górę. Zatrzymaj 20 sekund." },
        { name: "Masaż pięści", duration: 40, description: "Zaciskaj pięści, a następnie rozluźniaj przez 2 sekundy. Powtórz 20 razy. Potem rozciągaj palce maksymalnie." },
        { name: "Modlitewne rozciąganie", duration: 50, description: "Dłonie razem przed грудями, przesuwaj je powoli w dół, aż poczujesz napięcie. Zatrzymaj 20 sekund." }
      ]
    },
    eyes: {
      title: "Oczy",
      icon: "fas fa-eye",
      exercises: [
        { name: "Mruganie świadome", duration: 90, description: "Mrugaj powoli i świadomie przez 1,5 minuty. To nawilży oczy i rozluźni mięśnie." },
        { name: "Ruchy oczu", duration: 60, description: "Patrz w górę, dół, prawo, lewo i po przekątnych. Każdy kierunek 5 sekund. Powtórz cykl 3 razy." },
        { name: "Palming", duration: 120, description: "Zakryj oczy dłońmi (nie naciskając). Siedź w ciemności i oddychaj. 2 minuty pełnego relaksu." },
        { name: "Focus shift", duration: 300, description: "Patrz przez okno na coś daleko (min 20 m), potem na coś blisko (30 cm). Przełączaj co 10 sekund przez 5 minut." }
      ]
    },
    legs: {
      title: "Nogi",
      icon: "fas fa-person-walking",
      exercises: [
        { name: "Rozciąganie ud", duration: 50, description: "Siądź, złóż prawe nogi na lewe kolano. Pochylaj się do przodu. Zatrzymaj 20 sekund. Powtórz po drugiej stronie." },
        { name: "Rozciąganie łydek", duration: 45, description: "Siadaj przysiad, trzymając ścianę. Lewa noga zognięta, prawa wyprostowana. Zatrzymaj 20 sekund." },
        { name: "Mały spacer", duration: 180, description: "Przejdź 100-200 kroków po biurze lub korytarzu. Powoli, świadomie." },
        { name: "Ruchy nóg w siedzie", duration: 40, description: "Siedzisz i powoli unosisz prawe kolano, zatrzymujesz na 3 sekundy. Powtórz 10 razy na każdę nogę." }
      ]
    }
  },
  
  // Education articles (pozostaje bez zmian)
  articles: [
    {
      title: "Dlaczego ergonomia stanowiska jest ważna?",
      category: "Dlaczego to ważne",
      readingTime: 3,
      content: "Prawidłowa ergonomia to nie luksus - to inwestycja w Twoje zdrowie i życie. Praca w nieergonomicznym stanowisku powoduje bóle, zmęczenie i długoterminowe problemy zdrowotne. Ponad 79% pracowników biurowych codziennie odczuwa ból bezpośrednio związany z pracą. Dobra wiadomość? Większość problemów można rozwiązać już w 2-3 tygodnie prostych zmian. To nie wymaga dużych inwestycji - często to zwykła reorganizacja przestrzeni i kilka przyzwyczajeń."
    },
    {
      title: "Kąt 90 stopni - dlaczego to magiczna liczba?",
      category: "Jak to robić",
      readingTime: 3,
      content: "Gdy kąt w kolanach wynosi ok. 90°, a uda są równolegle do podłogi, przepływ krwi jest optymalny. Gdy zawijasz nogi pod siedzenie lub przesadnie je wyciągasz, ograniczasz krążenie, co prowadzi do zakrzepów, żylaków i bólu. Stopy powinny być całkowicie podparte - jeśli wisz - użyj podnóżka. To nie detail - to podstawa. Zmiana tego jednego ustawienia może zmienić Twoje samopoczucie w 1-2 tygodnie!"
    },
    {
      title: "Monitor na wysokości oczu - dlaczego?",
      category: "Jak to robić",
      readingTime: 3,
      content: "Gdy patrzysz na monitor, twoja głowa powinna być w naturalnej pozycji (lekko do góry). Jeśli monitor jest za nisko, wysuwasz głowę do przodu - już po pół godzinie czujesz ból szyi i karku. Przez rok to staje się chronicznym bólem. Górna krawędź monitora powinna być na wysokości oczu lub trochę poniżej, w odległości wyciągniętego ramienia (50-70 cm). To jedna z najważniejszych zmian!"
    },
    {
      title: "Zespół cieśni nadgarstka - jak go unikać?",
      category: "Poradnik",
      readingTime: 4,
      content: "Piszesz wiele? Mysz w złym miejscu? To sprawca zespołu cieśni nadgarstka (TOS). Nerw przeciśnięty w kanale nadgarstka powoduje: mrowienie, ból, bezsenność. Profilaktyka: mysz na tej samej wysokości co klawiatura, nadgarstki prosto, nie zawinięte. Regularnie rozciągaj dłonie - rób to co 30 minut. Jeśli już masz objawy - dodaj podpórkę pod nadgarstki."
    },
    {
      title: "Synergia ergonomii - efekt domina",
      category: "Dlaczego to ważne",
      readingTime: 3,
      content: "Ergonomia to nie pojedyncze elementy - to system. Dobrze ustawiony monitor wymaga dobrze ustawionego krzesła. Dobre krzesło wymaga podnóżka. Podnóżek wymaga regularnych przerw i ruchu. Wszystko ze sobą współpracuje. Nawet gdy poprawisz 70% - pozostałe 30% może zniwelować efekty. Dlatego ważne jest kompleksowe podejście. Zacznij od największego problemu i powoli dodawaj kolejne zmiany."
    },
    {
      title: "Mikroprzerwami - najlepsza inwestycja",
      category: "Poradnik",
      readingTime: 4,
      content: "Nie potrzebujesz długich przerw. Wystarczy co 30-40 minut wstać na 5 minut i zrobić parę rozciągnięć. To przywraca przepływ krwi, regeneruje oczy, zmienia perspektywę. Badania pokazują, że 5-minutowa przerwa co 30 minut ZWIĘKSZA produktywność (paradoks - ale prawdziwy). Ustaw timer - ta gra zmieni Twoją pracę. Zaczynasz teraz?"
    }
  ],
  
  // Gamification
  // ZMODYFIKOWANO: Usunięto odznaki związane z planem 10-dni (ID 2, 3, 4, 5, 6)
  // ZMODYFIKOWANO: Zmieniono punkty za Quiz Master z 500 na 100
  badges: [
    { id: 1, name: "Audyt się liczy", description: "Wykonaj swój pierwszy audyt ergonomii", icon: "fas fa-clipboard-check", points: 50, unlocked: false },
    { id: 7, name: "Edukator", description: "Przeczytaj wszystkie artykuły", icon: "fas fa-book-open", points: 100, unlocked: false },
    { id: 8, name: "Mistrz ćwiczeń", description: "Wykonaj 15 ćwiczeń", icon: "fas fa-dumbbell", points: 150, unlocked: false },
    { id: 9, name: "Quiz Master", description: "Wykonaj Test Wiedzy", icon: "fas fa-brain", points: 100, unlocked: false }
  ],
  
  // ZMODYFIKOWANO: Punkty za Platinum (Quiz) są teraz trudniejsze do zdobycia bez planu, ale zostawiamy.
  levels: [
    { name: "Bronze", minPoints: 0, description: "Zaczynam audyt" },
    { name: "Silver", minPoints: 150, description: "Robię postępy" },
    { name: "Gold", minPoints: 300, description: "Mistrz ergonomii" },
    { name: "Platinum", minPoints: 500, description: "Legenda ergonomii - Czas na Test Wiedzy!" }
  ]
};

// ZMODYFIKOWANO: Prawdziwy localStorage
const storage = {
  save() {
    try {
      localStorage.setItem('ergonomiaUserName', state.userName);
      localStorage.setItem('ergonomiaAuditHistory', JSON.stringify(state.auditHistory));
      localStorage.setItem('ergonomiaCompletedExercises', JSON.stringify(state.completedExercises));
      localStorage.setItem('ergonomiaReadArticles', JSON.stringify(state.readArticles));
      localStorage.setItem('ergonomiaBadges', JSON.stringify(state.badges));
      localStorage.setItem('ergonomiaPoints', state.points.toString());
      localStorage.setItem('ergonomiaStreak', state.streak.toString());
      localStorage.setItem('ergonomiaLastActivityDate', state.lastActivityDate);
      localStorage.setItem('ergonomiaQuizCompleted', state.quizCompleted.toString());
      localStorage.setItem('ergonomiaQuizBonusAwarded', state.quizBonusAwarded.toString());
      
      console.log('Data saved to localStorage');
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  },
  
  load() {
    try {
      const userName = localStorage.getItem('ergonomiaUserName');
      
      if (userName) {
        state.userName = userName;
        state.auditHistory = JSON.parse(localStorage.getItem('ergonomiaAuditHistory')) || [];
        state.completedExercises = JSON.parse(localStorage.getItem('ergonomiaCompletedExercises')) || [];
        state.readArticles = JSON.parse(localStorage.getItem('ergonomiaReadArticles')) || [];
        
        // Łączenie zapisanych odznak z domyślnymi (na wypadek aktualizacji)
        const savedBadges = JSON.parse(localStorage.getItem('ergonomiaBadges')) || [];
        state.badges = state.badges.map(defaultBadge => {
          const saved = savedBadges.find(b => b.id === defaultBadge.id);
          return saved ? { ...defaultBadge, unlocked: saved.unlocked } : defaultBadge;
        });

        state.points = parseInt(localStorage.getItem('ergonomiaPoints') || '0', 10);
        state.streak = parseInt(localStorage.getItem('ergonomiaStreak') || '0', 10);
        state.lastActivityDate = localStorage.getItem('ergonomiaLastActivityDate') || null;
        state.quizCompleted = (localStorage.getItem('ergonomiaQuizCompleted') === 'true') || false;
        state.quizBonusAwarded = (localStorage.getItem('ergonomiaQuizBonusAwarded') === 'true') || false;
        
        console.log('Data loaded from localStorage');
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to load from localStorage", e);
      return false;
    }
  },
  
  clear() {
    try {
      localStorage.removeItem('ergonomiaUserName');
      localStorage.removeItem('ergonomiaAuditHistory');
      localStorage.removeItem('ergonomiaCompletedExercises');
      localStorage.removeItem('ergonomiaReadArticles');
      localStorage.removeItem('ergonomiaBadges');
      localStorage.removeItem('ergonomiaPoints');
      localStorage.removeItem('ergonomiaStreak');
      localStorage.removeItem('ergonomiaLastActivityDate');
      localStorage.removeItem('ergonomiaQuizCompleted');
      localStorage.removeItem('ergonomiaQuizBonusAwarded');
      
      console.log('localStorage cleared');
    } catch (e) {
      console.error("Failed to clear localStorage", e);
    }
  }
};

// Application logic
const app = {
  init() {
    // Try to load from localStorage
    const hasData = storage.load();
    
    if (!hasData || !state.userName) {
      // First time user - show welcome screen
      this.showWelcomeScreen();
      return;
    }
    
    // USUNIĘTO: Inicjalizację planu 10-dni
    
    // Hide welcome screen and show app
    this.hideWelcomeScreen();
    
    // Render dashboard
    this.renderDashboard();
  },
  
  showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const appEl = document.getElementById('app');
    welcomeScreen.classList.remove('hidden');
    appEl.style.display = 'none';
  },
  
  hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const appEl = document.getElementById('app');
    welcomeScreen.classList.add('hidden');
    appEl.style.display = 'flex';
  },
  
  startAdventure() {
    const nameInput = document.getElementById('userNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
      this.showToast('Proszę wpisać swoje imię!', 'error');
      return;
    }
    
    // Save name to state and localStorage
    state.userName = name;
    // USUNIĘTO: Inicjalizację planu 10-dni
    storage.save();
    
    // Hide welcome screen and show app
    this.hideWelcomeScreen();
    
    // Render dashboard
    this.renderDashboard();
    
    // Show welcome toast
    this.showToast(`Witaj ${name}! 🎉 Zacznijmy Twoją przygodę z ergonomią!`, 'success');
    this.triggerConfetti();
  },
  
  navigateTo(section) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Znajdź przycisk menu na podstawie data-section lub onclick
    const menuItem = Array.from(document.querySelectorAll('.menu-item')).find(
      item => item.getAttribute('onclick')?.includes(`MapsTo('${section}')`)
    );
    if (menuItem) {
      menuItem.classList.add('active');
    }

    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
    });
    
    // Show target section
    state.currentSection = section;
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Render section content
    switch(section) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'audit':
        this.renderAudit();
        break;
      // USUNIĘTO: case 'plan'
      case 'exercises':
        this.renderExercises();
        break;
      case 'education':
        this.renderEducation();
        break;
      case 'results':
        this.renderResults();
        break;
      case 'gamification':
        this.renderGamification();
        break;
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
  },
  
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
  },
  
  renderDashboard() {
    this.updateDashboardMetrics();
    this.updateGreeting();
  },
  
  // ZMODYFIKOWANO: Uproszczony system powitań
  updateGreeting() {
    const displayName = state.userName || 'Przyjaciół';
    document.getElementById('greetingTitle').textContent = `Witaj, ${displayName}! 🎯`;
    
    const latestAudit = state.auditHistory[state.auditHistory.length - 1];
    if (latestAudit) {
      document.getElementById('greetingSubtitle').textContent = `Twój ostatni audyt: ${latestAudit.score}%. Gotowy na kolejny?`;
    } else {
      document.getElementById('greetingSubtitle').textContent = `Gotowy na swój pierwszy audyt ergonomii?`;
    }
    
    // Update CTA button
    const ctaButton = document.getElementById('dashboardCTA');
    ctaButton.innerHTML = '<i class="fas fa-play"></i> Rozpocznij Audyt';
    ctaButton.className = 'btn btn--primary btn--lg';
    
    // Update motivational quote (logika bez zmian)
    const quotes = [
      'Dzisiaj poprawiasz swoją ergonomię - jeden krok do zdrowszego kręgosłupa! 💪',
      'Twoje plecy Ci dziękują za każde wyzwanie. Jeśli się nie dziękują, rób więcej ćwiczeń! 😄',
      'Ergonomia to nie luksus, to inwestycja w Twoje przyszłe "ja" bez bólu. 🎯',
      'Pamiętaj: siedź jak król, pracuj jak uczony, ruszaj się jak atleta! 🏆',
      'Zero wyzwań opuszczonych = zero żalu jutro. Let\'s go! 🚀'
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('quoteText').textContent = randomQuote;
  },
  
  // ZMODYFIKOWANO: Uproszczone metryki
  updateDashboardMetrics() {
    // 1. Ergonomia (bez zmian)
    const latestAudit = state.auditHistory[state.auditHistory.length - 1];
    const ergonomicsEl = document.getElementById('metricErgonomics');
    if (latestAudit) {
      ergonomicsEl.textContent = latestAudit.score + '%';
      document.getElementById('ergonomicsProgress').textContent = `Ostatni audyt: ${new Date(latestAudit.date).toLocaleDateString('pl-PL')}`;
      const card = ergonomicsEl.closest('.metric-card');
      if (latestAudit.score >= 85) {
        card.style.borderColor = 'var(--color-success)';
      } else if (latestAudit.score >= 70) {
        card.style.borderColor = 'var(--color-primary)';
      } else if (latestAudit.score >= 50) {
        card.style.borderColor = 'var(--color-warning)';
      } else {
        card.style.borderColor = 'var(--color-error)';
      }
    } else {
      ergonomicsEl.textContent = '--';
      document.getElementById('ergonomicsProgress').textContent = 'Wykonaj swój pierwszy audyt';
    }
    
    // 2. Status Audytu (ZMIANA z "Wyzwanie")
    if (latestAudit) {
      document.getElementById('metricChallenge').textContent = 'Wykonany';
    } else {
      document.getElementById('metricChallenge').textContent = 'Do wykonania';
    }
    
    // 3. Streak (ZMIANA - liczy audyty)
    document.getElementById('metricStreak').textContent = state.auditHistory.length;
    document.getElementById('metricStreak').nextElementSibling.textContent = 'audytów'; // Zmiana jednostki
    
    // 4. Odznaki (bez zmian)
    const unlockedCount = state.badges.filter(b => b.unlocked).length;
    document.getElementById('metricBadges').textContent = `${unlockedCount} / ${state.badges.length}`;
    
    // 5. Skutki zdrowotne (bez zmian)
    const healthConsequences = this.countHealthConsequences();
    document.getElementById('metricHealth').textContent = healthConsequences;
    
    // 6. Ćwiczenia (ZMIANA - liczy wszystkie)
    document.getElementById('metricExercises').textContent = state.completedExercises.length;
    document.getElementById('exercisesProgressFill').style.width = '0%';
    
    // 7. Gamifikacja Level (bez zmian)
    const currentLevel = this.getCurrentLevel();
    const nextLevel = this.getNextLevel();
    document.getElementById('metricLevel').textContent = currentLevel.name;
    if (nextLevel) {
      document.getElementById('metricPoints').textContent = `${state.points} / ${nextLevel.minPoints} pkt`;
      const progressPercentage = Math.round(((state.points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100);
      document.getElementById('levelProgressFill').style.width = progressPercentage + '%';
    } else {
      document.getElementById('metricPoints').textContent = `${state.points} pkt (MAX)`;
      document.getElementById('levelProgressFill').style.width = '100%';
    }
    
    // 8. Quiz Bonusowy (logika w updateQuizBonusMetric)
    this.updateQuizBonusMetric();
  },
  
  // ZMODYFIKOWANO: Logika odblokowania quizu (3 warunki)
  updateQuizBonusMetric() {
    const quizCard = document.getElementById('quizBonusCard');
    const metricQuiz = document.getElementById('metricQuiz');
    const quizStatus = document.getElementById('quizStatus');
    
    // ZMIANA: Quiz wymaga teraz 3 warunków
    const auditCompleted = state.auditHistory.length > 0;
    const exercisesCompleted = state.completedExercises.length >= 5; // Założenie: "przejście ćwiczeń" = co najmniej 5
    const educationCompleted = state.readArticles.length === state.articles.length;

    const allConditionsMet = auditCompleted && exercisesCompleted && educationCompleted;
    
    if (allConditionsMet) {
      // Unlocked
      quizCard.classList.remove('locked');
      quizCard.classList.add('unlocked');
      
      if (state.quizCompleted) {
        quizCard.classList.add('completed');
        metricQuiz.textContent = '✓ Test Wykonany';
        quizStatus.textContent = 'Gratulacje! Zdobyto punkty.';
        quizStatus.style.color = 'var(--color-success)';
      } else {
        quizCard.classList.remove('completed');
        metricQuiz.textContent = 'Sprawdź swoją wiedzę!';
        quizStatus.textContent = 'Wszystkie warunki spełnione! +100 pkt'; // ZMIANA
        quizStatus.style.color = 'var(--color-purple-500)';
      }
    } else {
      // Locked
      quizCard.classList.add('locked');
      quizCard.classList.remove('unlocked', 'completed');
      metricQuiz.innerHTML = '🔒 Test Wiedzy';
      
      // ZMIANA: Pokaż co jeszcze brakuje
      let statusText = 'Odblokuj przez: ';
      let missing = [];
      if (!auditCompleted) missing.push('Audyt');
      if (!exercisesCompleted) missing.push('Min. 5 ćwiczeń');
      if (!educationCompleted) missing.push('Edukację');
      
      quizStatus.textContent = 'Brakuje: ' + missing.join(', ');
      quizStatus.style.color = 'var(--color-text-secondary)';
    }
  },
  
  // ZMODYFIKOWANO: Logika odblokowania quizu (3 warunki)
  handleQuizBonus() {
    // ZMIANA: Sprawdzenie 3 warunków
    const auditCompleted = state.auditHistory.length > 0;
    const exercisesCompleted = state.completedExercises.length >= 5;
    const educationCompleted = state.readArticles.length === state.articles.length;
    const allConditionsMet = auditCompleted && exercisesCompleted && educationCompleted;
    
    if (!allConditionsMet) {
      this.showToast('🔒 Quiz odblokuje się po ukończeniu Audytu, min. 5 ćwiczeń i przeczytaniu wszystkich materiałów!', 'error');
      return;
    }
    
    if (state.quizCompleted) {
      this.showToast('Test Wiedzy został już wykonany! ✓', 'success');
      return;
    }
    
    // Otwórz link do quizu (tu wstawić prawdziwy link)
    const quizLink = 'https://forms.google.com/your-quiz-link-here'; // UWAGA: Wstawić prawdziwy link
    window.open(quizLink, '_blank');
    
    // Oznacz jako wykonany i przyznaj punkty
    state.quizCompleted = true;
    
    if (!state.quizBonusAwarded) {
      state.quizBonusAwarded = true;
      this.addPoints(100); // ZMIANA: Punkty za quiz
      this.checkBadge(9); // Odznaka Quiz Master (ID 9)
      this.showToast('🎉 Test Wiedzy wykonany! +100 punktów!', 'success');
      this.triggerConfetti();
    }
    
    storage.save();
    this.updateQuizBonusMetric();
  },
  
  countHealthConsequences() {
    // Logika bez zmian - bazuje na ostatnim audycie
    const latestAudit = state.auditHistory[state.auditHistory.length - 1];
    if (!latestAudit) return 0;
    
    // Poprawka: bazuj na 'uncheckedItems' z zapisanego audytu
    if (latestAudit.uncheckedItems) {
        const uniqueRisks = new Set(latestAudit.uncheckedItems.map(item => item.healthRisk));
        return uniqueRisks.size;
    }
    
    return 0; // Nie ma audytu, nie ma konsekwencji
  },
  
  calculateExercisesToday() {
    // USUNIĘTO: Logikę 10-dniowego planu
    return { percentage: 0, completed: state.completedExercises.length, total: 0 };
  },
  
  // ZMODYFIKOWANO: Opisy podpowiedzi
  showMetricTooltip(metricId) {
    const tooltips = {
      'ergonomia': 'Ile procent Twojego stanowiska pracy jest ergonomicznie poprawne wg ostatniego audytu. Im wyżej, tym mniej będziesz chodzić do lekarza 🏥.',
      'daily-challenge': 'Pokazuje status Twojego audytu. Należy go wykonać, aby odblokować Test Wiedzy.',
      'streak': 'Całkowita liczba wykonanych przez Ciebie audytów. Wykonuj audyt regularnie (np. co miesiąc), aby śledzić postępy!',
      'badges': 'Ile odznak już masz? To jak kolekcja Pokemon, ale dla Twojej ergonomii 🏆. Każda odznaka to dowód, że coś zrobiłeś!',
      'health-consequences': 'Ile skutków zdrowotnych Twój ostatni audyt odkrył. To jak lista "rzeczy do zrobienia" ale dla Twojego ciała. Im mniej, tym lepiej! 🎯',
      'exercises-today': 'Całkowita liczba wykonanych przez Ciebie ćwiczeń z biblioteki. Ruszaj się!',
      'gamification-level': 'Jakim jesteś poziomem w grze ergonomii? Bronze to początek, Platinum to legenda 👑. Punkty się zbierają za audyty, ćwiczenia i edukację.',
      'quiz-bonus': 'Test Wiedzy. Odblokowuje się po wykonaniu Audytu, min. 5 Ćwiczeń i przeczytaniu wszystkich Materiałów Edukacyjnych.'
    };
    
    const tooltip = document.getElementById('metricTooltip');
    const content = document.getElementById('tooltipContent');
    content.textContent = tooltips[metricId] || 'Brak opisu';
    tooltip.classList.add('show');
  },
  
  hideMetricTooltip() {
    document.getElementById('metricTooltip').classList.remove('show');
  },
  
  // ZMODYFIKOWANO: Kieruje do audytu
  handleDashboardCTA() {
    // ZMIENIONO: Kieruje do funkcji rozpoczynającej nowy audyt (z resetem)
    this.startNewAudit();
  },
  
  // NOWA FUNKCJA: Resetuje stan audytu i przechodzi do niego
  startNewAudit() {
    // resetuje stan pytań przed renderowaniem
    state.auditSections.forEach(section => {
        if (section.questions) {
            section.questions.forEach(q => q.checked = false);
        }
        if (section.symmetricQuestions) {
            section.symmetricQuestions.forEach(q => q.checked = false);
        }
        if (section.mixedQuestions) {
            section.mixedQuestions.forEach(q => q.checked = false);
        }
        if (section.hasMode) {
            section.mode = 'na';
        }
        if (section.hasApplies) {
            section.applies = false;
        }
    });
    this.navigateTo('audit');
  },

  renderAudit() {
    // USUNIĘTO BLOK RESETOWANIA STANU - To naprawia błąd resetowania przy wyborze opcji
    /*
    state.auditSections.forEach(section => {
        // ...
    });
    */

    const content = document.getElementById('auditContent');
    
    let html = '<div class="audit-split-layout">';
    
    // Left side: Audit sections
    html += '<div class="audit-left-panel">';
    
    state.auditSections.forEach(section => {
      html += `
        <div class="audit-section-card" data-section-id="${section.id}">
          <div class="audit-section-header">
            <div style="font-size: 36px; color: var(--color-primary);"><i class="${section.icon}"></i></div>
            <div>
              <h3 style="margin: 0; font-size: var(--font-size-xl);">${section.title}</h3>
              <p style="margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm);">Waga: ${section.weight}%</p>
            </div>
          </div>
      `;
      
      // Section 5: 2 monitors with dropdown
      if (section.hasMode) {
        html += `
          <div style="margin-bottom: var(--space-16);">
            <label style="display: block; margin-bottom: var(--space-8); font-weight: var(--font-weight-medium);">Tryb pracy:</label>
            <select class="form-control" onchange="app.changeMonitorMode(this.value)" style="width: 100%;">
              <option value="na" ${section.mode === 'na' ? 'selected' : ''}>Nie dotyczy</option>
              <option value="sym" ${section.mode === 'sym' ? 'selected' : ''}>Symetryczne ustawienie</option>
              <option value="mix" ${section.mode === 'mix' ? 'selected' : ''}>Jeden główny + pomocniczy</option>
            </select>
          </div>
        `;
        
        // Show questions based on mode
        if (section.mode === 'sym') {
          html += '<div class="audit-questions">';
          section.symmetricQuestions.forEach((q, idx) => {
            html += `
              <div class="audit-question-item ${q.checked ? 'checked' : 'unchecked'}">
                <label style="display: flex; align-items: flex-start; gap: var(--space-12); cursor: pointer;">
                  <input type="checkbox" 
                         ${q.checked ? 'checked' : ''}
                         onchange="app.toggleMonitorQuestion('sym', ${idx})"
                         style="width: 20px; height: 20px; margin-top: 2px; cursor: pointer; accent-color: var(--color-primary);">
                  <span style="flex: 1; line-height: 1.5;">${q.text}</span>
                  ${!q.checked ? '<i class="fas fa-exclamation-triangle" style="color: var(--color-warning); font-size: 16px; margin-top: 2px;"></i>' : ''}
                </label>
              </div>
            `;
          });
          html += '</div>';
        } else if (section.mode === 'mix') {
          html += '<div class="audit-questions">';
          section.mixedQuestions.forEach((q, idx) => {
            html += `
              <div class="audit-question-item ${q.checked ? 'checked' : 'unchecked'}">
                <label style="display: flex; align-items: flex-start; gap: var(--space-12); cursor: pointer;">
                  <input type="checkbox" 
                         ${q.checked ? 'checked' : ''}
                         onchange="app.toggleMonitorQuestion('mix', ${idx})"
                         style="width: 20px; height: 20px; margin-top: 2px; cursor: pointer; accent-color: var(--color-primary);">
                  <span style="flex: 1; line-height: 1.5;">${q.text}</span>
                  ${!q.checked ? '<i class="fas fa-exclamation-triangle" style="color: var(--color-warning); font-size: 16px; margin-top: 2px;"></i>' : ''}
                </label>
              </div>
            `;
          });
          html += '</div>';
        } else {
          html += '<p style="color: var(--color-text-secondary); padding: var(--space-16); background: var(--color-bg-2); border-radius: var(--radius-base);"><i class="fas fa-info-circle"></i> Ta sekcja nie dotyczy Twojego stanowiska</p>';
        }
      }
      // Section 6: Laptop with checkbox
      else if (section.hasApplies) {
        html += `
          <div style="margin-bottom: var(--space-16);">
            <label style="display: flex; align-items: center; gap: var(--space-12); cursor: pointer; padding: var(--space-12); background: var(--color-bg-2); border-radius: var(--radius-base);">
              <input type="checkbox" 
                     ${section.applies ? 'checked' : ''}
                     onchange="app.toggleLaptopApplies()"
                     style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--color-primary);">
              <span style="font-weight: var(--font-weight-medium);">Pracuję na laptopie</span>
            </label>
          </div>
        `;
        
        if (section.applies) {
          html += '<div class="audit-questions">';
          section.questions.forEach((q, idx) => {
            html += `
              <div class="audit-question-item ${q.checked ? 'checked' : 'unchecked'}">
                <label style="display: flex; align-items: flex-start; gap: var(--space-12); cursor: pointer;">
                  <input type="checkbox" 
                         ${q.checked ? 'checked' : ''}
                         onchange="app.toggleAuditQuestion(${section.id}, ${idx})"
                         style="width: 20px; height: 20px; margin-top: 2px; cursor: pointer; accent-color: var(--color-primary);">
                  <span style="flex: 1; line-height: 1.5;">${q.text}</span>
                  ${!q.checked ? '<i class="fas fa-exclamation-circle" style="color: var(--color-red-500); font-size: 16px; margin-top: 2px;"></i>' : ''}
                </label>
              </div>
            `;
          });
          html += '</div>';
        } else {
          html += '<p style="color: var(--color-text-secondary); padding: var(--space-16); background: var(--color-bg-2); border-radius: var(--radius-base);"><i class="fas fa-info-circle"></i> Zaznacz powyżej, jeśli pracujesz na laptopie</p>';
        }
      }
      // Regular sections
      else {
        html += '<div class="audit-questions">';
        section.questions.forEach((q, idx) => {
          html += `
            <div class="audit-question-item ${q.checked ? 'checked' : 'unchecked'}">
              <label style="display: flex; align-items: flex-start; gap: var(--space-12); cursor: pointer;">
                <input type="checkbox" 
                       ${q.checked ? 'checked' : ''}
                       onchange="app.toggleAuditQuestion(${section.id}, ${idx})"
                       style="width: 20px; height: 20px; margin-top: 2px; cursor: pointer; accent-color: var(--color-primary);">
                  <span style="flex: 1; line-height: 1.5;">${q.text}</span>
                  ${!q.checked ? `<i class="fas fa-exclamation-triangle" style="color: ${section.id <= 4 ? 'var(--color-orange-500)' : 'var(--color-warning)'}; font-size: 16px; margin-top: 2px;"></i>` : ''}
                </label>
              </div>
            `;
        });
        html += '</div>';
      }
      
      html += '</div>';
    });
    
    html += `
      <div style="display: flex; gap: var(--space-16); justify-content: center; margin-top: var(--space-32); padding-bottom: var(--space-32);">
        <button class="btn btn--primary btn--lg" onclick="app.completeAudit()">
          <i class="fas fa-check"></i> Zakończ audyt
        </button>
      </div>
    `;
    html += '</div>'; // End audit-left-panel
    
    // Right side: Consequences panel
    html += '<div class="audit-right-panel" id="consequencesPanel">';
    html += this.renderConsequencesPanel();
    html += '</div>';
    
    html += '</div>'; // End audit-split-layout
    content.innerHTML = html;
  },
  
  toggleAuditQuestion(sectionId, questionIdx) {
    const section = state.auditSections.find(s => s.id === sectionId);
    if (section && section.questions[questionIdx]) {
      section.questions[questionIdx].checked = !section.questions[questionIdx].checked;
      this.updateConsequencesPanel();
      // Aktualizuj stan UI (checked/unchecked) bez pełnego re-render
      const item = document.querySelector(`input[onchange="app.toggleAuditQuestion(${sectionId}, ${questionIdx})"]`).closest('.audit-question-item');
      item.classList.toggle('checked', section.questions[questionIdx].checked);
      item.classList.toggle('unchecked', !section.questions[questionIdx].checked);
      const icon = item.querySelector('i');
      if (icon) {
        icon.style.display = section.questions[questionIdx].checked ? 'none' : 'block';
      }
    }
  },
  
  changeMonitorMode(mode) {
    const section = state.auditSections.find(s => s.id === 5);
    if (section) {
      section.mode = mode;
      this.renderAudit(); // Pełne przeładowanie jest tu konieczne do zmiany pytań
    }
  },
  
  toggleMonitorQuestion(type, idx) {
    const section = state.auditSections.find(s => s.id === 5);
    if (!section) return;
    
    const questions = type === 'sym' ? section.symmetricQuestions : section.mixedQuestions;
    if (questions[idx]) {
      questions[idx].checked = !questions[idx].checked;
      this.updateConsequencesPanel();
      // Aktualizuj stan UI
      const item = document.querySelector(`input[onchange="app.toggleMonitorQuestion('${type}', ${idx})"]`).closest('.audit-question-item');
      item.classList.toggle('checked', questions[idx].checked);
      item.classList.toggle('unchecked', !questions[idx].checked);
      const icon = item.querySelector('i');
      if (icon) {
        icon.style.display = questions[idx].checked ? 'none' : 'block';
      }
    }
  },
  
  toggleLaptopApplies() {
    const section = state.auditSections.find(s => s.id === 6);
    if (section) {
      section.applies = !section.applies;
      this.renderAudit(); // Pełne przeładowanie jest tu konieczne do zmiany pytań
    }
  },
  
  renderConsequencesPanel() {
    const uncheckedIssues = this.getUncheckedIssues();
    
    let html = `
      <div class="consequences-header">
        <h3><i class="fas fa-heartbeat"></i> Panel Skutków Zdrowotnych</h3>
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-top: var(--space-8);">Aktualizuje się na żywo podczas wypełniania audytu</p>
      </div>
    `;
    
    if (Object.keys(uncheckedIssues).length === 0) {
      html += `
        <div class="consequences-empty">
          <div style="font-size: 64px; color: var(--color-success); margin-bottom: var(--space-16);">
            <i class="fas fa-check-circle"></i>
          </div>
          <h4 style="color: var(--color-success); margin-bottom: var(--space-8);">Świetnie!</h4>
          <p style="color: var(--color-text-secondary);">Wszystkie punkty ergonomiczne spełnione. Kontynuuj dobrą pracę!</p>
        </div>
      `;
    } else {
      // Sort by urgency
      const sortedIssues = Object.entries(uncheckedIssues).sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        return urgencyOrder[a[1].urgency] - urgencyOrder[b[1].urgency];
      });
      
      html += '<div class="consequences-list">';
      
      sortedIssues.forEach(([riskKey, data]) => {
        const consequence = state.healthConsequences[riskKey];
        if (!consequence) return;
        
        const urgencyIcon = consequence.urgency === 'critical' ? 'fa-circle-exclamation' : 
                           consequence.urgency === 'high' ? 'fa-triangle-exclamation' : 'fa-exclamation';
        const urgencyLabel = consequence.urgency === 'critical' ? 'KRYTYCZNE' : 
                            consequence.urgency === 'high' ? 'WYSOKIE' : 'ŚREDNIE';
        
        html += `
          <div class="consequence-card consequence-${consequence.urgency}" style="animation: slideIn 0.3s ease-out;">
            <div class="consequence-header">
              <div style="display: flex; align-items: flex-start; gap: var(--space-12);">
                <i class="${consequence.icon}" style="font-size: 28px; color: ${consequence.color};"></i>
                <div>
                  <div class="consequence-urgency">
                    <i class="fas ${urgencyIcon}"></i> ${urgencyLabel}
                  </div>
                  <h4 style="margin: var(--space-4) 0 0 0; font-size: var(--font-size-lg);">${consequence.name}</h4>
                </div>
              </div>
            </div>
            <div class="consequence-body">
              <div style="margin-bottom: var(--space-12);">
                <strong style="color: var(--color-text); display: block; margin-bottom: var(--space-8);">Skutki zdrowotne:</strong>
                <ul style="margin: 0; padding-left: var(--space-20); color: var(--color-text-secondary);">
                  ${consequence.effects.map(effect => `<li style="margin-bottom: var(--space-4);">${effect}</li>`).join('')}
                </ul>
              </div>
              <div>
                <strong style="color: var(--color-text); display: block; margin-bottom: var(--space-8);">Co zrobić:</strong>
                <ul style="margin: 0; padding-left: var(--space-20); color: var(--color-primary);">
                  ${consequence.actionItems.map(action => `<li style="margin-bottom: var(--space-4);">${action}</li>`).join('')}
                </ul>
              </div>
            </div>
            <div class="consequence-footer">
              <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                <i class="fas fa-exclamation-circle"></i> ${data.count} ${data.count === 1 ? 'niezaznaczony punkt' : 'niezaznaczone punkty'}
              </span>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    return html;
  },
  
  getUncheckedIssues() {
    const issues = {};
    
    state.auditSections.forEach(section => {
      // Regular sections
      if (!section.hasMode && !section.hasApplies) {
        section.questions.forEach(q => {
          if (!q.checked && q.healthRisk) {
            if (!issues[q.healthRisk]) {
              issues[q.healthRisk] = {
                urgency: state.healthConsequences[q.healthRisk]?.urgency || 'medium',
                count: 0
              };
            }
            issues[q.healthRisk].count++;
          }
        });
      }
      // 2 monitors section
      else if (section.hasMode && section.mode !== 'na') {
        const questions = section.mode === 'sym' ? section.symmetricQuestions : section.mixedQuestions;
        questions.forEach(q => {
          if (!q.checked && q.healthRisk) {
            if (!issues[q.healthRisk]) {
              issues[q.healthRisk] = {
                urgency: state.healthConsequences[q.healthRisk]?.urgency || 'medium',
                count: 0
              };
            }
            issues[q.healthRisk].count++;
          }
        });
      }
      // Laptop section
      else if (section.hasApplies && section.applies) {
        section.questions.forEach(q => {
          if (!q.checked && q.healthRisk) {
            if (!issues[q.healthRisk]) {
              issues[q.healthRisk] = {
                urgency: state.healthConsequences[q.healthRisk]?.urgency || 'medium',
                count: 0
              };
            }
            issues[q.healthRisk].count++;
          }
        });
      }
    });
    
    return issues;
  },
  
  updateConsequencesPanel() {
    const panel = document.getElementById('consequencesPanel');
    if (panel) {
      panel.innerHTML = this.renderConsequencesPanel();
    }
  },
  
  updateDashboardKPIs() {
    // Legacy function for compatibility
    this.updateDashboardMetrics();
  },
  
  // ZMODYFIKOWANO: Uproszczone przyznawanie odznak
  completeAudit() {
    // Calculate score
    let totalWeight = 0;
    let achievedWeight = 0;
    let uncheckedItems = [];
    
    state.auditSections.forEach(section => {
      // Regular sections
      if (!section.hasMode && !section.hasApplies) {
        section.questions.forEach(q => {
          totalWeight += q.weight;
          if (q.checked) {
            achievedWeight += q.weight;
          } else {
            uncheckedItems.push({
              section: section.title,
              question: q.text,
              sectionIcon: section.icon,
              healthRisk: q.healthRisk
            });
          }
        });
      }
      // 2 monitors section
      else if (section.hasMode) {
        if (section.mode !== 'na') {
          const questions = section.mode === 'sym' ? section.symmetricQuestions : section.mixedQuestions;
          questions.forEach(q => {
            totalWeight += q.weight;
            if (q.checked) {
              achievedWeight += q.weight;
            } else {
              uncheckedItems.push({
                section: section.title,
                question: q.text,
                sectionIcon: section.icon,
                healthRisk: q.healthRisk
              });
            }
          });
        }
        // If "not applicable", don't count this section's weight
      }
      // Laptop section
      else if (section.hasApplies) {
        if (section.applies) {
          section.questions.forEach(q => {
            totalWeight += q.weight;
            if (q.checked) {
              achievedWeight += q.weight;
            } else {
              uncheckedItems.push({
                section: section.title,
                question: q.text,
                sectionIcon: section.icon,
                healthRisk: q.healthRisk
              });
            }
          });
        }
        // If not applicable, don't count
      }
    });
    
    // Zapobieganie dzieleniu przez zero, jeśli nic nie zostało zaznaczone
    const score = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
    
    // Save audit result
    const auditResult = {
      date: new Date().toISOString(),
      score: score,
      // Zapisujemy stan *tylko* tych sekcji, które były aktywne
      sections: JSON.parse(JSON.stringify(state.auditSections)), 
      uncheckedItems: uncheckedItems
    };
    
    state.auditHistory.push(auditResult);
    
    // Check for badges
    this.checkBadge(1); // First audit (ID 1)
    
    // USUNIĘTO: Odznaki za plan 10-dni
    
    this.addPoints(50);
    this.showToast('Audyt ukończony! +50 punktów', 'success');
    
    // Zapisz stan do localStorage
    storage.save();
    
    // ZMIANA: Zaktualizuj status quizu po audycie
    this.updateQuizBonusMetric();

    // Show personalized plan immediately
    this.showPersonalizedPlan(auditResult);
  },
  
  // ZMODYFIKOWANO: Zmieniono przycisk nawigacji i dodano przycisk eksportu
  showPersonalizedPlan(auditResult) {
    const content = document.getElementById('auditContent');
    const statusInfo = this.getStatusInfo(auditResult.score);
    
    let html = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="text-align: center; background: var(--color-surface); border: 2px solid var(--color-card-border); border-radius: var(--radius-xl); padding: var(--space-48) var(--space-32); margin-bottom: var(--space-32);">
          <div style="font-size: 80px; font-weight: var(--font-weight-bold); color: ${statusInfo.color}; margin-bottom: var(--space-16);">${auditResult.score}%</div>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-8);">${statusInfo.label}</div>
          <div style="color: var(--color-text-secondary);">Twój wynik audytu ergonomii</div>
        </div>
        
        <div style="background: var(--color-bg-2); border: 2px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-32); margin-bottom: var(--space-32);">
          <h3 style="font-size: var(--font-size-2xl); margin-bottom: var(--space-20); display: flex; align-items: center; justify-content: space-between;">
            <span style="display: flex; align-items: center; gap: var(--space-12);">
              <i class="fas fa-list-check" style="color: var(--color-primary);"></i>
              Zidentyfikowane problemy
            </span>
            <!-- ZMIANA: Przycisk eksportu zaleceń (Drukuj/PDF) -->
            <button class="btn btn--outline btn--sm" onclick="app.printRecommendations()">
              <i class="fas fa-print"></i> Drukuj / Zapisz Zalecenia (PDF)
            </button>
          </h3>
    `;
    
    if (auditResult.uncheckedItems.length > 0) {
      html += '<p style="margin-bottom: var(--space-20); color: var(--color-text-secondary);">Oto obszary, które wymagają poprawy:</p>';
      
      // Group by health risk
      const groupedByRisk = {};
      auditResult.uncheckedItems.forEach(item => {
        if (!item.healthRisk) return; // Pomiń pytania bez ryzyka
        if (!groupedByRisk[item.healthRisk]) {
          groupedByRisk[item.healthRisk] = [];
        }
        groupedByRisk[item.healthRisk].push(item);
      });
      
      // Sort by urgency
      const sortedRisks = Object.entries(groupedByRisk).sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        const urgencyA = state.healthConsequences[a[0]]?.urgency || 'medium';
        const urgencyB = state.healthConsequences[b[0]]?.urgency || 'medium';
        return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
      });
      
      sortedRisks.forEach(([riskKey, items]) => {
        const consequence = state.healthConsequences[riskKey];
        if (!consequence) return;
        
        const borderColor = consequence.urgency === 'critical' ? 'var(--color-red-500)' :
                           consequence.urgency === 'high' ? 'var(--color-orange-500)' : 'var(--color-yellow-500)';
        
        html += `
          <div style="background: var(--color-surface); padding: var(--space-20); border-radius: var(--radius-base); margin-bottom: var(--space-16); border-left: 4px solid ${borderColor};">
            <div style="display: flex; align-items: flex-start; gap: var(--space-12); margin-bottom: var(--space-12);">
              <i class="${consequence.icon}" style="font-size: 24px; color: ${borderColor}; margin-top: 2px;"></i>
              <div style="flex: 1;">
                <div style="font-weight: var(--font-weight-bold); margin-bottom: var(--space-4); font-size: var(--font-size-lg);">${consequence.name}</div>
                <div style="font-size: var(--font-size-xs); color: ${borderColor}; font-weight: var(--font-weight-bold); text-transform: uppercase; margin-bottom: var(--space-8);">
                  ${consequence.urgency === 'critical' ? '⚠️ KRYTYCZNE' : consequence.urgency === 'high' ? '🔺 WYSOKIE' : '⚠️ ŚREDNIE'}
                </div>
              </div>
            </div>
            <div style="margin-bottom: var(--space-12); padding-left: var(--space-32);">
              <strong style="display: block; margin-bottom: var(--space-4); font-size: var(--font-size-sm);">Niezaznaczone punkty:</strong>
              ${items.map(item => `<div style="color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-4);">• ${item.question}</div>`).join('')}
            </div>
            <div style="padding-left: var(--space-32);">
              <strong style="display: block; margin-bottom: var(--space-4); font-size: var(--font-size-sm);">Skutki:</strong>
              <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${consequence.effects.slice(0, 2).join(', ')}</div>
            </div>
          </div>
        `;
      });
    } else {
      html += '<p style="color: var(--color-success); font-weight: var(--font-weight-semibold);"><i class="fas fa-check-circle"></i> Wszystkie punkty spełnione! Gratulacje!</p>';
    }
    
    html += '</div>';
    
    // Comparison with previous audit
    if (state.auditHistory.length > 1) {
      const prevAudit = state.auditHistory[state.auditHistory.length - 2];
      const improvement = auditResult.score - prevAudit.score;
      html += `
        <div style="background: var(--color-surface); border: 2px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-24); margin-bottom: var(--space-32);">
          <h3 style="margin-bottom: var(--space-16);"><i class="fas fa-chart-line"></i> Porównanie z poprzednim audytem</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-16);">
            <div style="text-align: center; padding: var(--space-16); background: var(--color-bg-1); border-radius: var(--radius-base);">
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-4);">Poprzedni</div>
              <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold);">${prevAudit.score}%</div>
            </div>
            <div style="text-align: center; padding: var(--space-16); background: ${improvement > 0 ? 'var(--color-bg-3)' : 'var(--color-bg-4)'}; border-radius: var(--radius-base);">
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-4);">Zmiana</div>
              <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: ${improvement > 0 ? 'var(--color-success)' : 'var(--color-error)'};">  ${improvement > 0 ? '+' : ''}${improvement}%</div>
            </div>
            <div style="text-align: center; padding: var(--space-16); background: var(--color-bg-1); border-radius: var(--radius-base);">
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-4);">Aktualny</div>
              <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${auditResult.score}%</div>
            </div>
          </div>
        </div>
      `;
    }
    
    html += `
        <div style="display: flex; gap: var(--space-16); justify-content: center; flex-wrap: wrap;">
          <!-- ZMIENIONO: Przycisk nawigacji -->
          <button class="btn btn--primary btn--lg" onclick="app.navigateTo('dashboard')">
            <i class="fas fa-home"></i> Wróć do panelu
          </button>
          <button class="btn btn--outline btn--lg" onclick="app.navigateTo('results')">
            <i class="fas fa-chart-line"></i> Zobacz szczegółowe wyniki
          </button>
          <!-- ZMIANA: Przycisk "Nowy audyt" teraz resetuje stan -->
          <button class="btn btn--outline btn--lg" onclick="app.startNewAudit()">
            <i class="fas fa-redo"></i> Wykonaj nowy audyt
          </button>
        </div>
      </div>
    `;
    
    content.innerHTML = html;
  },

  // ZMODYFIKOWANO: Zmiana z 'export' na 'print' (generowanie HTML do druku/PDF)
  printRecommendations() {
    const latestAudit = state.auditHistory[state.auditHistory.length - 1];
    if (!latestAudit || !latestAudit.uncheckedItems || latestAudit.uncheckedItems.length === 0) {
        this.showToast('Brak zaleceń do eksportu. Gratulacje!', 'success');
        return;
    }
    
    let reportHtml = `
      <html>
      <head>
        <title>Zalecenia Ergonomiczne - ${state.userName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 30px; }
          h1 { font-size: 24px; color: #111; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          h2 { font-size: 18px; color: #333; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;}
          .meta { font-size: 14px; color: #555; margin-bottom: 20px; }
          .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
          .section-header { background-color: #f9f9f9; padding: 10px 15px; border-bottom: 1px solid #ddd; }
          .section-header h3 { margin: 0; font-size: 16px; }
          .section-header span { font-size: 12px; padding: 3px 8px; border-radius: 12px; background-color: #eee; color: #111; }
          .section-header .critical { background-color: #fdd; color: #c00; }
          .section-header .high { background-color: #fee; color: #a60; }
          .section-header .medium { background-color: #fff8e0; color: #a16400; }
          .section-body { padding: 15px; }
          .section-body strong { font-size: 13px; color: #000; display: block; margin-bottom: 5px; }
          .section-body ul { margin: 0 0 15px 20px; padding: 0; }
          .section-body li { font-size: 14px; color: #444; margin-bottom: 5px; }
          .action-items li { color: #005a9c; }
        </style>
      </head>
      <body>
        <h1>Zalecenia Ergonomiczne</h1>
        <div class="meta">
          <strong>Pracownik:</strong> ${state.userName}<br>
          <strong>Data Audytu:</strong> ${new Date(latestAudit.date).toLocaleDateString('pl-PL')}<br>
          <strong>Wynik:</strong> ${latestAudit.score}%
        </div>
        <p>Poniżej znajduje się lista zidentyfikowanych problemów i zalecanych działań naprawczych.</p>
    `;

    // Group by health risk (copy logic from showPersonalizedPlan)
    const groupedByRisk = {};
    latestAudit.uncheckedItems.forEach(item => {
        if (!item.healthRisk) return;
        if (!groupedByRisk[item.healthRisk]) {
            groupedByRisk[item.healthRisk] = [];
        }
        groupedByRisk[item.healthRisk].push(item);
    });
    
    const sortedRisks = Object.entries(groupedByRisk).sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        const urgencyA = state.healthConsequences[a[0]]?.urgency || 'medium';
        const urgencyB = state.healthConsequences[b[0]]?.urgency || 'medium';
        return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
    });

    sortedRisks.forEach(([riskKey, items]) => {
        const consequence = state.healthConsequences[riskKey];
        if (!consequence) return;
        
        let urgencyClass = consequence.urgency; // critical, high, medium
        let urgencyLabel = consequence.urgency.toUpperCase();

        reportHtml += `
          <div class="section">
            <div class="section-header">
              <h3 style="display: flex; justify-content: space-between; align-items: center;">
                ${consequence.name}
                <span class="${urgencyClass}">${urgencyLabel}</span>
              </h3>
            </div>
            <div class="section-body">
              <strong>Niezaznaczone punkty (do poprawy):</strong>
              <ul>
                ${items.map(item => `<li>${item.question}</li>`).join('')}
              </ul>
              <strong>Zalecane działania (Co zrobić):</strong>
              <ul class="action-items">
                ${consequence.actionItems.map(action => `<li>${action}</li>`).join('')}
              </ul>
              <strong>Możliwe skutki zdrowotne:</strong>
              <ul>
                ${consequence.effects.map(effect => `<li>${effect}</li>`).join('')}
              </ul>
            </div>
          </div>
        `;
    });
    
    reportHtml += `
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus(); // Wymagane w niektórych przeglądarkach
    
    // Użyj setTimeout, aby dać przeglądarce czas na renderowanie CSS
    setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Można zostawić otwarte, aby użytkownik mógł zobaczyć
    }, 500); // 500ms opóźnienia
  },
  
  showAuditHistory() {
    if (state.auditHistory.length === 0) {
      this.showToast('Brak historii audytów', 'error');
      return;
    }
    
    let html = '<div style="max-width: 800px; margin: 0 auto;">';
    html += '<h3 style="margin-bottom: var(--space-24);">Historia audytów</h3>';
    
    state.auditHistory.forEach((audit, idx) => {
      const date = new Date(audit.date).toLocaleDateString('pl-PL');
      html += `
        <div style="background: var(--color-surface); border: 2px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-20); margin-bottom: var(--space-16);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Audyt #${idx + 1} - ${date}</div>
              <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary); margin-top: var(--space-4);">${audit.score}%</div>
            </div>
            ${idx > 0 ? `
              <div style="text-align: right;">
                <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Zmiana</div>
                <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: ${audit.score > state.auditHistory[idx-1].score ? 'var(--color-success)' : 'var(--color-error)'};">  ${audit.score - state.auditHistory[idx-1].score > 0 ? '+' : ''}${audit.score - state.auditHistory[idx-1].score}%</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    const content = document.getElementById('auditContent');
    content.innerHTML = html;
  },
  
  // USUNIĘTO: renderPlan, toggleDay, resetPlan, getDayTypeIcon, getDayTypeLabel
  
  renderExercises() {
    // Logika bez zmian
    const content = document.getElementById('exercisesContent');
    let html = '<div class="exercise-categories">';
    
    Object.entries(state.exercises).forEach(([key, category]) => {
      html += `
        <div class="exercise-category">
          <div class="category-header">
            <div class="category-icon"><i class="${category.icon}"></i></div>
            <div class="category-title">${category.title}</div>
          </div>
          <ul class="exercise-list">
            ${category.exercises.map((ex, idx) => `
              <li class="exercise-item" onclick="app.startExercise('${key}', ${idx})">
                <div class="exercise-item-header">
                  <div class="exercise-name">${ex.name}</div>
                  <div class="exercise-duration"><i class="fas fa-clock"></i> ${ex.duration}s</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    });
    
    html += '</div>';
    content.innerHTML = html;
  },
  
  startExercise(categoryKey, exerciseIdx) {
    // Logika bez zmian
    const exercise = state.exercises[categoryKey].exercises[exerciseIdx];
    const modal = document.getElementById('exerciseModal');
    const content = document.getElementById('exerciseModalContent');
    
    let timeLeft = exercise.duration;
    let timerInterval;
    
    const formatTime = (seconds) => {
      if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
      }
      return `${seconds}s`;
    };
    
    const updateTimer = () => {
      if(document.getElementById('timerValue')) {
          document.getElementById('timerValue').textContent = formatTime(timeLeft);
      }
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if(document.getElementById('timerValue')) {
            document.getElementById('timerValue').textContent = 'Wykonane!';
            document.getElementById('timerValue').style.color = 'var(--color-success)';
        }
        this.completeExercise(categoryKey, exerciseIdx);
        setTimeout(() => {
          this.closeExerciseModal();
        }, 1500);
      }
      timeLeft--;
    };
    
    content.innerHTML = `
      <div class="timer-display">
        <div class="timer-circle" id="timerValue">${formatTime(timeLeft)}</div>
        <div class="timer-exercise-name">${exercise.name}</div>
        <div class="timer-description">${exercise.description}</div>
        <div class="timer-controls">
          <button class="btn btn--primary" onclick="app.closeExerciseModal()">
            <i class="fas fa-stop"></i> Zatrzymaj
          </button>
        </div>
      </div>
    `;
    
    modal.classList.add('show');
    timerInterval = setInterval(updateTimer, 1000);
    
    // Store interval so we can clear it when modal closes
    modal.timerInterval = timerInterval;
  },
  
  completeExercise(categoryKey, exerciseIdx) {
    // Logika bez zmian
    const exerciseId = `${categoryKey}-${exerciseIdx}`;
    if (!state.completedExercises.includes(exerciseId)) {
      state.completedExercises.push(exerciseId);
      this.addPoints(15);
      this.showToast('Ćwiczenie ukończone! +15 punktów', 'success');
      
      // Check badge
      if (state.completedExercises.length >= 15) {
        this.checkBadge(8); // Master of exercises (ID 8)
      }
      
      storage.save();
      this.updateDashboardMetrics(); // Zaktualizuj licznik ćwiczeń
      this.updateQuizBonusMetric(); // ZMIANA: Sprawdź, czy to odblokowało quiz
    }
    
    // Play sound (simple beep)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported, skip
    }
  },
  
  closeExerciseModal() {
    // Logika bez zmian
    const modal = document.getElementById('exerciseModal');
    if (modal.timerInterval) {
      clearInterval(modal.timerInterval);
      modal.timerInterval = null;
    }
    modal.classList.remove('show');
  },
  
  renderEducation() {
    // Logika bez zmian
    const content = document.getElementById('educationContent');
    let html = '';
    
    state.articles.forEach((article, idx) => {
      const isRead = state.readArticles.includes(idx);
      html += `
        <div class="article-card" onclick="app.openArticle(${idx})">
          <div class="article-category">${article.category}</div>
          <div class="article-title">${article.title}</div>
          <div class="article-preview">${article.content.substring(0, 100)}...</div>
          <div class="article-footer">
            <span><i class="fas fa-clock"></i> ${article.readingTime} min</span>
            ${isRead ? '<span style="color: var(--color-success);"><i class="fas fa-check"></i> Przeczytane</span>' : ''}
          </div>
        </div>
      `;
    });
    
    content.innerHTML = html;
  },
  
  // ZMODYFIKOWANO: Dodano timer
  openArticle(idx) {
    const article = state.articles[idx];
    const modal = document.getElementById('articleModal');
    const content = document.getElementById('articleModalContent');
    
    const isRead = state.readArticles.includes(idx);
    let timeLeft = 15; // NOWY Timer 15 sekund

    content.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto;">
        <div style="display: inline-block; padding: var(--space-4) var(--space-12); background: var(--color-bg-5); color: var(--color-purple-500); border-radius: var(--radius-full); font-size: var(--font-size-xs); margin-bottom: var(--space-12);">
          ${article.category}
        </div>
        <h2 style="font-size: var(--font-size-3xl); margin-bottom: var(--space-16);">${article.title}</h2>
        <div style="color: var(--color-text-secondary); margin-bottom: var(--space-24); font-size: var(--font-size-sm);">
          <i class="fas fa-clock"></i> ${article.readingTime} min czytania
        </div>
        <div style="line-height: 1.8; font-size: var(--font-size-base); color: var(--color-text);">
          ${article.content}
        </div>
        <div style="margin-top: var(--space-32); text-align: center;">
          <button class="btn btn--primary" id="markReadButton" onclick="app.markArticleRead(${idx})" ${isRead ? '' : 'disabled'}>
            ${isRead ? '<i class="fas fa-check"></i> Przeczytane' : `<i class="fas fa-hourglass-start"></i> Zaliczone za ${timeLeft}s`}
          </button>
        </div>
      </div>
    `;
    
    modal.classList.add('show');
    
    // ZMIANA: Dodanie timera
    if (!isRead) {
        const button = document.getElementById('markReadButton');
        modal.articleTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                if(button) button.innerHTML = `<i class="fas fa-hourglass-start"></i> Zaliczone za ${timeLeft}s`;
            } else {
                clearInterval(modal.articleTimer);
                if(button) {
                  button.innerHTML = '<i class="fas fa-check"></i> Oznacz jako przeczytane';
                  button.disabled = false;
                }
            }
        }, 1000);
    }
  },
  
  // ZMODYFIKOWANO: Aktualizuje quiz po przeczytaniu
  markArticleRead(idx) {
    if (!state.readArticles.includes(idx)) {
      state.readArticles.push(idx);
      this.addPoints(30);
      this.showToast('Artykuł przeczytany! +30 punktów', 'success');
      
      // Check badges
      if (state.readArticles.length === state.articles.length) {
        this.checkBadge(7); // Educator (ID 7)
      }
      
      storage.save();
      this.updateQuizBonusMetric(); // ZMIANA: Sprawdź, czy to odblokowało quiz
    }
    
    this.closeArticleModal();
    this.renderEducation();
  },
  
  // ZMODYFIKOWANO: Czyści timer przy zamykaniu
  closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal.articleTimer) {
        clearInterval(modal.articleTimer);
        modal.articleTimer = null;
    }
    modal.classList.remove('show');
  },
  
  // ZMODYFIKOWANO: Uproszczone metryki
  renderResults() {
    const content = document.getElementById('resultsContent');
    
    if (state.auditHistory.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: var(--space-48);">
          <div style="font-size: 64px; color: var(--color-text-secondary); margin-bottom: var(--space-24);">
            <i class="fas fa-chart-line"></i>
          </div>
          <h3 style="margin-bottom: var(--space-16);">Brak wyników</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: var(--space-24);">Wykonaj pierwszy audyt ergonomii, aby zobaczyć swoje wyniki.</p>
          <button class="btn btn--primary" onclick="app.navigateTo('audit')">
            <i class="fas fa-play"></i> Rozpocznij audyt
          </button>
        </div>
      `;
      return;
    }
    
    const latestAudit = state.auditHistory[state.auditHistory.length - 1];
    const statusInfo = this.getStatusInfo(latestAudit.score);
    
    let html = `
      <div class="results-main-stat">
        <div class="main-stat-value" style="color: ${statusInfo.color};">${latestAudit.score}%</div>
        <div class="main-stat-label">${statusInfo.label}</div>
      </div>
      
      <div class="results-grid">
        <div class="result-card">
          <div class="result-card-header">
            <div class="result-card-title">Wykonane Audyty</div>
            <div class="result-card-value">${state.auditHistory.length}</div>
          </div>
        </div>
        <div class="result-card">
          <div class="result-card-header">
            <div class="result-card-title">Ćwiczenia</div>
            <div class="result-card-value">${state.completedExercises.length}</div>
          </div>
        </div>
        <div class="result-card">
          <div class="result-card-header">
            <div class="result-card-title">Artykuły</div>
            <div class="result-card-value">${state.readArticles.length}/${state.articles.length}</div>
          </div>
        </div>
        <div class="result-card">
          <div class="result-card-header">
            <div class="result-card-title">Punkty</div>
            <div class="result-card-value">${state.points}</div>
          </div>
        </div>
      </div>
    `;
    
    // Audit history comparison
    if (state.auditHistory.length > 1) {
      html += '<div style="background: var(--color-surface); border: 2px solid var(--color-card-border); border-radius: var(--radius-lg); padding: var(--space-24); margin-top: var(--space-32);">';
      html += '<h3 style="margin-bottom: var(--space-20);"><i class="fas fa-chart-line"></i> Porównanie audytów - Przed i Po</h3>';
      
      const firstAudit = state.auditHistory[0];
      const lastAudit = state.auditHistory[state.auditHistory.length - 1];
      const improvement = lastAudit.score - firstAudit.score;
      const improvementPercent = firstAudit.score > 0 ? Math.round((improvement / firstAudit.score) * 100) : (improvement > 0 ? 100 : 0);
      
      html += `
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--space-24); align-items: center; margin-bottom: var(--space-24);">
          <div style="text-align: center; padding: var(--space-24); background: var(--color-bg-1); border-radius: var(--radius-lg);">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8);">Pierwszy audyt</div>
            <div style="font-size: 48px; font-weight: var(--font-weight-bold); color: var(--color-text);">${firstAudit.score}%</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-4);">${new Date(firstAudit.date).toLocaleDateString('pl-PL')}</div>
          </div>
          <div style="text-align: center;">
            <i class="fas fa-arrow-right" style="font-size: 32px; color: ${improvement > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)'}"></i>
            <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: ${improvement > 0 ? 'var(--color-success)' : 'var(--color-error)'}; margin-top: var(--space-8);">${improvement > 0 ? '+' : ''}${improvement}%</div>
          </div>
          <div style="text-align: center; padding: var(--space-24); background: var(--color-bg-3); border-radius: var(--radius-lg); border: 2px solid var(--color-success);">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8);">Ostatni audyt</div>
            <div style="font-size: 48px; font-weight: var(--font-weight-bold); color: var(--color-success);">${lastAudit.score}%</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-4);">${new Date(lastAudit.date).toLocaleDateString('pl-PL')}</div>
          </div>
        </div>
      `;
      
      if (improvement > 0) {
        html += `<div style="text-align: center; padding: var(--space-16); background: var(--color-bg-3); border-radius: var(--radius-base); margin-bottom: var(--space-16);">`;
        html += `<i class="fas fa-trophy" style="font-size: 24px; color: var(--color-success); margin-right: var(--space-8);"></i>`;
        html += `<span style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold);">Poprawa o ${improvementPercent}%! 🎉</span>`;
        html += `</div>`;
      }
      
      html += '<h4 style="margin: var(--space-24) 0 var(--space-16) 0;">Historia wszystkich audytów</h4>';
      html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-16);">';
      
      state.auditHistory.forEach((audit, idx) => {
        const date = new Date(audit.date).toLocaleDateString('pl-PL');
        html += `
          <div style="background: var(--color-bg-1); padding: var(--space-16); border-radius: var(--radius-base); text-align: center;">
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8);">Audyt #${idx + 1}</div>
            <div style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${audit.score}%</div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-4);">${date}</div>
          </div>
        `;
      });
      
      html += '</div></div>';
    }
    
    content.innerHTML = html;
  },
  
  getStatusInfo(score) {
    // Logika bez zmian
    if (score >= 85) return { label: 'Świetnie!', color: 'var(--color-success)' };
    if (score >= 70) return { label: 'Dobrze', color: 'var(--color-primary)' };
    if (score >= 50) return { label: 'Do poprawy', color: 'var(--color-warning)' };
    return { label: 'Wymaga uwagi', color: 'var(--color-error)' };
  },
  
  exportReport() {
    // ZMODYFIKOWANO: Usunięto wzmianki o planie 10-dni
    if (state.auditHistory.length === 0) {
      this.showToast('Brak danych do eksportu', 'error');
      return;
    }
    
    const latestAudit = state.auditHistory[state.auditHistory.length - 1];
    let report = '=== RAPORT ERGONOMII - LABORATORIUM ERGONOMII 2.1 ===\n\n';
    report += `Data: ${new Date().toLocaleDateString('pl-PL')}\n\n`;
    report += `Ogólny wynik ostatniego audytu: ${latestAudit.score}%\n`;
    report += `Status: ${this.getStatusInfo(latestAudit.score).label}\n\n`;
    report += `Łączna liczba audytów: ${state.auditHistory.length}\n`;
    report += `Ćwiczenia: ${state.completedExercises.length} ukończone\n`;
    report += `Artykuły: ${state.readArticles.length}/${state.articles.length} przeczytane\n`;
    report += `Punkty: ${state.points}\n`;
    report += `Odznaki: ${state.badges.filter(b => b.unlocked).length}/${state.badges.length}\n\n`;
    
    if (state.auditHistory.length > 1) {
      report += '=== HISTORIA AUDYTÓW ===\n';
      state.auditHistory.forEach((audit, idx) => {
        report += `Audyt #${idx + 1}: ${audit.score}% (${new Date(audit.date).toLocaleDateString('pl-PL')})\n`;
      });
    }
    
    // Użycie document.execCommand('copy') dla kompatybilności
    const textArea = document.createElement("textarea");
    textArea.value = report;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        this.showToast('Raport skopiowany do schowka!', 'success');
    } catch (err) {
        this.showToast('Błąd podczas kopiowania', 'error');
    }
    document.body.removeChild(textArea);
  },
  
  renderGamification() {
    // Logika bez zmian, ale dane (badges) są przefiltrowane
    const content = document.getElementById('gamificationContent');
    
    // Determine current level
    const currentLevel = this.getCurrentLevel();
    const nextLevel = this.getNextLevel();
    
    let html = `
      <div class="level-display">
        <div class="level-name">${currentLevel.name}</div>
        <div class="level-points">${state.points} / ${nextLevel ? nextLevel.minPoints : '∞'} punktów</div>
        <p style="margin-top: var(--space-8); color: var(--color-text-secondary);">${currentLevel.description}</p>
      </div>
      
      <div style="margin-bottom: var(--space-32);">
        <h3 style="margin-bottom: var(--space-20);"><i class="fas fa-award"></i> Odznaki</h3>
        <div class="badges-grid">
    `;
    
    state.badges.forEach(badge => {
      html += `
        <div class="badge-card ${badge.unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-icon"><i class="${badge.icon}"></i></div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-description">${badge.description}</div>
          <div class="badge-points">+${badge.points} pkt</div>
          ${badge.unlocked ? '<div style="margin-top: var(--space-8); color: var(--color-success); font-size: var(--font-size-sm);"><i class="fas fa-check"></i> Odblokowane</div>' : ''}
        </div>
      `;
    });
    
    html += '</div></div>';
    
    // Dodanie sekcji resetowania
    html += `
      <div style="margin-top: var(--space-32); padding-top: var(--space-24); border-top: 2px solid var(--color-card-border); text-align: center;">
        <h4 style="margin-bottom: var(--space-16); color: var(--color-error);">Strefa niebezpieczna</h4>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-16);">Usunięcie danych jest nieodwracalne. Użyj, jeśli chcesz zacząć od nowa.</p>
        <button class="btn btn--outline" onclick="app.resetAllData()" style="border-color: var(--color-error); color: var(--color-error);">
          <i class="fas fa-trash"></i> Zresetuj wszystkie dane
        </button>
      </div>
    `;

    content.innerHTML = html;
  },
  
  resetAllData() {
    // Użycie niestandardowego alertu zamiast confirm()
    this.showToast('Funkcja resetowania wymaga potwierdzenia. Kliknij ponownie, aby potwierdzić.', 'warning');

    // Zmień funkcję przycisku, aby drugie kliknięcie było potwierdzeniem
    const originalButton = document.querySelector('button[onclick="app.resetAllData()"]');
    if (originalButton) {
        originalButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> POTWIERDŹ RESET';
        originalButton.onclick = () => {
            storage.clear();
            // Przeładuj stronę, aby wyczyścić stan
            window.location.reload();
        };
        // Przywróć oryginalną funkcję po 5 sekundach
        setTimeout(() => {
            if (originalButton) {
                originalButton.innerHTML = '<i class="fas fa-trash"></i> Zresetuj wszystkie dane';
                originalButton.onclick = () => app.resetAllData();
            }
        }, 5000);
    }
  },

  getCurrentLevel() {
    // Logika bez zmian
    let currentLevel = state.levels[0];
    for (const level of state.levels) {
      if (state.points >= level.minPoints) {
        currentLevel = level;
      }
    }
    return currentLevel;
  },
  
  getNextLevel() {
    // Logika bez zmian
    for (const level of state.levels) {
      if (state.points < level.minPoints) {
        return level;
      }
    }
    return null;
  },
  
  checkBadge(badgeId) {
    // Logika bez zmian
    const badge = state.badges.find(b => b.id === badgeId);
    if (badge && !badge.unlocked) {
      badge.unlocked = true;
      this.addPoints(badge.points);
      this.showBadgeUnlocked(badge);
      storage.save();
    }
  },
  
  showBadgeUnlocked(badge) {
    // Logika bez zmian
    this.showToast(`🎉 Odznaka odblokowani: ${badge.name}! +${badge.points} pkt`, 'success');
    this.triggerConfetti();
  },
  
  addPoints(points) {
    // ZMODYFIKOWANO: Logika quizu jest oddzielona od poziomów
    const oldLevel = this.getCurrentLevel();
    state.points += points;
    const newLevel = this.getCurrentLevel();
    
    if (oldLevel.name !== newLevel.name) {
      this.showToast(`🎉 Awans na poziom: ${newLevel.name}!`, 'success');
      this.triggerConfetti();
    }
    
    storage.save();
    this.updateDashboardMetrics();
  },
  
  // USUNIĘTO: updateStreak()
  
  showToast(message, type = 'success') {
    // Logika bez zmian
    const toast = document.getElementById('toast');
    if (!toast) return; // Zabezpieczenie
    const icon = type === 'success' ? '<i class="fas fa-check-circle toast-icon"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle toast-icon"></i>' : '<i class="fas fa-info-circle toast-icon"></i>');
    toast.innerHTML = icon + '<span>' + message + '</span>';
    toast.className = 'toast show toast-' + type;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },
  
  triggerConfetti() {
    // Logika bez zmian
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        
        if (p.y > canvas.height) {
          particles.splice(index, 1);
        }
      });
      
      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  
  // Close tooltip when clicking outside
  document.addEventListener('click', (e) => {
    const tooltip = document.getElementById('metricTooltip');
    if (tooltip && tooltip.classList.contains('show')) {
      if (!tooltip.contains(e.target) && !e.target.closest('.metric-info')) {
        app.hideMetricTooltip();
      }
    }
  });
});