export interface RegulaminBlock {
  type: "paragraph" | "list" | "subheading";
  text?: string;
  items?: string[];
}

export interface RegulaminSection {
  id: string;
  title: string;
  blocks: RegulaminBlock[];
}

export const REGULAMIN_INTRO = {
  title: "OFICJALNY REGULAMIN LIGI H2H „NA MINUSIE ™”",
  paragraphs: [
    'Społeczność „Na Minusie ™” to miejsce dla graczy, którzy podchodzą do Fantasy Premier League z prawdziwą pasją i zaangażowaniem. Stawiamy na jakość, merytorykę i innowacyjność. Powstała w wyniku fuzji serwerów liga ma jasny podział: Baldwiniasty odpowiada za tętniącą życiem społeczność i zarządzanie serwerem, a St0pa pełni rolę architekta, czuwając nad organizacją, logistyką i funkcjonowaniem systemu ligowego.',
    "Odrzucamy losowe, frustrujące formaty ligowe na rzecz unikalnego systemu, który nagradza realne umiejętności i utrzymuje zaangażowanie przez cały rok.",
  ],
};

export const REGULAMIN_SECTIONS: RegulaminSection[] = [
  {
    id: "format",
    title: "1. FORMAT ROZGRYWEK I STRUKTURA LIGI",
    blocks: [
      {
        type: "paragraph",
        text: "Rozgrywki opierają się na szczeblach ligowych (dywizjach), które bezpośrednio odwzorowują profesjonalną piramidę piłkarską w Anglii.",
      },
      {
        type: "list",
        items: [
          "Pojemność Dywizji: Każda dywizja składa się z dokładnie 10 zespołów.",
          "Dwa sezony w jednym roku: Pełny rok w FPL dzielimy na dwa oddzielne, niezależne sezony ligowe: Sezon Jesienny (Gameweek 1 – Gameweek 19) oraz Sezon Wiosenny (Gameweek 20 – Gameweek 38).",
          "Ciągłe Nazewnictwo Sezonów: Ponieważ w jednym roku kalendarzowym FPL gramy dwa sezony naszej ligi, wprowadzamy ciągłą numerację historyczną. Przykładowo: Sezon 1 (jesień 2026/27), Sezon 2 (wiosna 2026/27), Sezon 3 (jesień 2027/28), Sezon 4 (wiosna 2027/28) i tak dalej.",
          "Nazewnictwo Szczebli: Tier 1: Premier League (Ścisła elita, mistrz serwera) | Tier 2: Championship (Bezpośrednie zaplecze) | Tier 3: League One | Tier 4: League Two | Tier 5+: National League (i niższe).",
        ],
      },
    ],
  },
  {
    id: "zapisy",
    title: "2. ZAPISY, KLUBY I WPISOWE",
    blocks: [
      {
        type: "list",
        items: [
          "Limity miejsc i start ligi: Rozgrywki wystartują pod warunkiem uzbierania minimum 2 pełnych dywizji (20 graczy). Wstępny, maksymalny limit miejsc na start to 5 dywizji (50 graczy)*. *Zastrzeżenie: W przypadku ogromnego zainteresowania i bardzo szybkiego zapełnienia list na długo przed deadlinem 1. kolejki, administracja zastrzega sobie prawo do zwiększenia limitu i utworzenia kolejnych dywizji.",
          "Wybór Klubu: Każdy gracz przed startem sezonu wybiera jeden oficjalny angielski klub piłkarski, pod którego szyldem będzie występował. Obowiązuje zasada unikalności – jeden klub może reprezentować tylko jedna osoba na całym serwerze (kto pierwszy, ten lepszy). Herby wybranych przez Was drużyn będą oficjalnie używane do oprawy wizualnej na Discordzie oraz w innych narzędziach, które będziemy wykorzystywać w przyszłości.",
          "Wyjątek organizatora (tzw. Lex St0pa): Jako że główny architekt ligi nie przepada za żadnym realnym angielskim klubem, ale sam ustalał ten regulamin i coś wybrać musiał, skorzystał z absolutnego weta organizatora. Tym samym St0pa oficjalnie przejmuje stery w AFC Richmond. W końcu jakby nie patrzeć, grali w Premier League, prawda? Wierzymy w Teda Lasso!",
          "Wpisowe: Udział w lidze wymaga opłacenia symbolicznej składki w wysokości 10 zł na CAŁY ROK (obejmuje oba sezony: jesienny i wiosenny). Tytuł przelewu BLIK: Przy wykonywaniu przelewu na telefon należy koniecznie wpisać w tytuł przelewu swój Nick z Discorda. W przypadku, gdy aplikacja bankowa automatycznie nadpisze tytuł przelewu (np. standardowym komunikatem „Przelew BLIK na telefon”), administracja zastrzega sobie prawo do zgłoszenia się do gracza w wiadomości prywatnej (DM) z prośbą o przesłanie potwierdzenia przelewu, lub zrzutu ekranu w celu weryfikacji.",
          "Wydanie Kodu do Ligi Classic i weryfikacja uczestnictwa: Tajny kod dostępu do naszej ogólnej ligi w aplikacji FPL (The FA Ranking) zostanie wysłany w wiadomości prywatnej DOPIERO PO ZAKSIĘGOWANIU WPŁATY wpisowego przez administrację (lub po pozytywnej weryfikacji miejsca darmowego). Wraz z nim gracz otrzymuje tajny kod lub automatyczny link (auto-join) do ligi Classic o nazwie „Na Minusie ™”. Rygorystyczna zasada 24 godzin: Od momentu otrzymania wiadomości, gracz ma dokładnie 24 godziny na dołączenie do ligi w aplikacji FPL. Konsekwencje braku dołączenia w ciągu 24h: Gracz zostaje usunięty z projektu, jego wpisowe podlega zwrotowi (lub darmowe miejsce przepada), a jego slot trafia do puli rekrutacji uzupełniającej.",
          "Nagrody: 100% zebranej puli przeznaczane jest na fizyczne, personalizowane statuetki i puchary dla Mistrzów poszczególnych dywizji H2H. Nagrody dostarczane są po zakończeniu sezonu kurierem lub do Paczkomatu. Uwaga: Na dzień dzisiejszy nie przewidujemy nagród rzeczowych za zwycięstwo w Wielkim Pucharze (The FA Cup) oraz w ogólnej lidze Classic (The FA Ranking). Triumfatorzy tych rozgrywek zostaną jednak oficjalnie uwiecznieni i wyróżnieni w serwerowej Galeri Sław (Hall of Fame) społeczności „Na Minusie ™”.",
          "Darmowe Miejsca (Jednorazowy Bonus Powitalny): Z okazji startu ligi i fuzji serwerów (przed Sezonem 1), administracja przygotowała pulę 20 darmowych wejściówek na cały rok. Baldwiniasty sponsoruje wpisowe dla pierwszych 10 osób z serwera \"Na Minusie\", a St0pa dla pierwszych 10 osób z serwera \"FPL Arena\". Opublikowana zostanie transparentna lista graczy zwolnionych z opłaty. Pozostali uczestnicy mają 3 dni na wpłatę od momentu zgłoszenia.",
          "Nowi gracze i podział początkowy: W pierwszym sezonie dywizje tworzone są na podstawie Overall Rank (OR) graczy z poprzedniego sezonu FPL. W kolejnych sezonach o rozstawieniu decydują uzyskane awanse i spadki. Zupełnie nowi gracze, dołączający w kolejnych sezonach, zaczynają grę od najniższych utworzonych dywizji. Jeśli nowych graczy będzie więcej niż 10 (co oznacza otwarcie kilku nowych, najniższych lig), zostaną oni rozstawieni w tych ligach na podstawie ich OR z poprzedniego sezonu FPL. W przypadku, gdy nowi gracze nie posiadają OR (całkowicie nowe konta w FPL), a jest ich więcej niż 10, o przypisaniu do dywizji decyduje kolejność zgłoszeń z opłaconą składką.",
        ],
      },
      {
        type: "subheading",
        text: "2.1. Reguła Niepełnej Dywizji (Sytuacja Stykowa)",
      },
      {
        type: "paragraph",
        text: "Jeżeli po zamknięciu zapisów na samym dole drabinki pozostanie niepełna dywizja (np. 5 osób), administracja wdraża następujące kroki:",
      },
      {
        type: "list",
        items: [
          "Opcja A (Priorytet): Szybka mobilizacja na serwerze i znalezienie graczy do pełnej 10.",
          "Opcja B (Zastępcza): Utworzenie mniejszej ligi (np. 6–8 osobowej) na Sezon Jesienny z odpowiednio zmniejszoną liczbą awansów/spadków. W przerwie między rundami (GW19-GW20) otwarta zostaje rekrutacja uzupełniająca do pełnej 10 na Sezon Wiosenny.",
          "Opcja C (Ostateczność): Rezygnacja z uruchomienia ostatniej, niepełnej dywizji na Sezon Jesienny. Gracze z tej grupy otrzymują natychmiastowy zwrot wpisowego i mają zarezerwowane miejsce na start w Sezonie Wiosennym.",
        ],
      },
      {
        type: "subheading",
        text: "2.2. Rekrutacja uzupełniająca (awaryjna)",
      },
      {
        type: "paragraph",
        text: "Uruchamiana jest wyłącznie w przypadku zwolnienia się miejsc (np. z powodu braku dołączenia przez innych graczy w ciągu 24h) lub niepełnej dywizji (brak 10 graczy w dywizji). Osoby dołączające w ramach tej rekrutacji mają czas na wpłatę i natychmiastowe dołączenie do ligi „Na Minusie ™” maksymalnie do twardego deadline'u 1. kolejki (GW1).",
      },
    ],
  },
  {
    id: "punkty",
    title: "3. SYSTEM PUNKTACJI (MEDIANA 2+1)",
    blocks: [
      {
        type: "paragraph",
        text: 'W przeciwieństwie do tradycyjnego Head-to-Head, nasza liga rozwiązuje problem "pecha" w losowaniu terminarza. Wykorzystujemy nowatorski system True-Skill Median 2+1. W każdej z 18 kolejek gracz rozgrywa mecz bezpośredni, ale rywalizuje również z resztą ligi. W pojedynczej kolejce gracz może zdobyć maksymalnie 3 punkty do tabeli ligowej:',
      },
      {
        type: "list",
        items: [
          "+2 punkty za zwycięstwo w meczu H2H.",
          "+1 punkt za remis w meczu H2H.",
          "0 punktów za porażkę w meczu H2H.",
          "+1 punkt (Bonus) – przyznawany za uzyskanie wyniku równego lub wyższego od Mediany danej dywizji w tej kolejce.",
        ],
      },
      {
        type: "subheading",
        text: "Jak liczymy Medianę?",
      },
      {
        type: "paragraph",
        text: "Jako Medianę w dywizji zawsze przyjmujemy wynik punktowy gracza, który zajął 5. miejsce w danej kolejce (GW). Oznacza to, że każdy gracz, którego wynik punktowy jest równy lub wyższy od liczby punktów zdobytej przez gracza z 5. miejsca, automatycznie otrzymuje punkt bonusowy do tabeli.",
      },
      {
        type: "list",
        items: [
          "Przykład 1 (Wysoki wynik, pech w H2H): Zdobywasz świetne 85 punktów, ale Twój rywal ma dzień życia i trafia 86 pkt. Przegrywasz mecz (0 pkt). Jednak gracz na 5. miejscu w Twojej lidze zdobył w tej kolejce 60 pkt. Ponieważ Twój wynik (85) jest równy lub wyższy niż wynik gracza z 5. miejsca (60), w nagrodę za wybitną kolejkę i tak inkasujesz +1 pkt do tabeli.",
          "Przykład 2 (Niski wynik, szczęście w H2H): Zdobywasz bardzo słabe 35 punktów, ale Twój rywal zapomniał ustawić skład i robi tylko 30 pkt. Wygrywasz mecz H2H zgarniając +2 punkty. Jednak wynik gracza na 5. miejscu (nasza Mediana) wyniósł w tej kolejce 50 pkt. Ponieważ Twój wynik (35) jest niższy od wyniku gracza z 5. miejsca (50), nie dostajesz bonusu. Za tę kolejkę inkasujesz tylko 2 punkty (a nie maksymalne 3).",
        ],
      },
      {
        type: "subheading",
        text: "3.1. Zasada Progu Punktowego (Remis na linii Mediany)",
      },
      {
        type: "paragraph",
        text: "Jeżeli kilku graczy na granicy podziału mediany (np. gracz na 5. i 6. miejscu w dywizji w danej kolejce) ma dokładnie taki sam wynik punktowy, progiem bonusowym staje się ten właśnie wynik. Każdy gracz, który osiągnął ten próg (lub go przekroczył), otrzymuje dodatkowy punkt.",
      },
      {
        type: "subheading",
        text: "3.2. Klasyfikacja w Tabeli Dywizyjnej (Remisy punktowe po 18 kolejkach)",
      },
      {
        type: "paragraph",
        text: "Na koniec sezonu bardzo często dochodzi do sytuacji, w której kilku graczy ma w tabeli identyczną liczbę Dużych Punktów. O ostatecznym miejscu w tabeli dywizyjnej decydują kolejno:",
      },
      {
        type: "list",
        items: [
          "Większa liczba dużych punktów ligowych (suma punktów za mecze H2H oraz bonusów z mediany).",
          'Łączna suma tzw. "małych punktów" (Overall Score): Zwycięża gracz, który w przekroju całego danego sezonu (18 kolejek) zdobył łącznie więcej fizycznych punktów w grze FPL.',
          "Bezpośrednie starcia (H2H): Jeśli gracze mają dokładnie taką samą liczbę dużych punktów oraz identyczną sumę małych punktów w FPL, decyduje bilans ich bezpośrednich meczów w danym sezonie.",
          "Przykład: Gracz A (Arsenal) i Gracz B (Leeds) na koniec Sezonu 1 mają po 35 punktów w tabeli Dywizji 1. Sprawdzamy drugi punkt regulaminu, czyli tzw. \"małe punkty\". Gracz A przez 18 kolejek uzbierał w FPL łącznie 1150 punktów. Gracz B zgromadził ich 1140. Wyższe miejsce w ostatecznej tabeli dywizji zajmuje Gracz A.",
        ],
      },
      {
        type: "subheading",
        text: "3.3. Usunięcie konta FPL w trakcie rozgrywek (Anulowanie wyników)",
      },
      {
        type: "paragraph",
        text: "Jeśli menedżer w trakcie trwania rozgrywek (sezon jesienny lub wiosenny) całkowicie usunie swoje konto w grze FPL, zostaje bezwzględnie usunięty z naszej ligi (tracąc również prawo do gry w kolejnym sezonie w danym roku). Wpłacone wpisowe nie podlega zwrotowi, a ewentualny bonus powitalny przepada. W ujęciu technicznym, aby uniknąć konieczności przebudowywania tabeli i weryfikacji zdobytych już punktów, wyniki wszystkich spotkań z tym graczem (zarówno minionych, jak i przyszłych w danym sezonie) zostają całkowicie anulowane. Gracz ten zostaje automatycznie przesunięty na ostatnie, 10. miejsce w tabeli i traktowany jest jako pierwszy spadkowicz. Dzięki temu nie zaburzamy wyliczonych już wcześniej Median i nie zmieniamy wstecznie układu sił w dywizji.",
      },
    ],
  },
  {
    id: "awansy",
    title: "4. AWANSE, SPADKI I BARAŻE (GW19 i GW38)",
    blocks: [
      {
        type: "paragraph",
        text: "Mechanika ligi gwarantuje gigantyczne emocje aż do ostatniej kolejki każdej rundy.",
      },
      {
        type: "list",
        items: [
          "Kolejki 1–18 (w obu sezonach) to regularne mecze ligowe (mecz i rewanż).",
          "Ostatnia kolejka (GW19 i GW38) każdego sezonu to Kolejka Barażowa.",
          "Miejsca 1 i 2: Bezpośredni awans do wyższej ligi (w najwyższej lidze walczą o Mistrzostwo).",
          "Miejsce 3: Gra mecz Barażowy o awans.",
          "Miejsca 4-7: Bezpieczne utrzymanie w lidze.",
          "Miejsce 8: Gra mecz Barażowy o utrzymanie.",
          "Miejsca 9 i 10: Bezpośredni spadek do niższej ligi.",
        ],
      },
      {
        type: "subheading",
        text: "4.1. Zasady Rozgrywania Baraży",
      },
      {
        type: "paragraph",
        text: "W GW19 oraz GW38 rozgrywane są bezpośrednie mecze o wszystko: Drużyna z 8. miejsca (broniąca się przed spadkiem) gra H2H z drużyną z 3. miejsca niższej dywizji (walczącą o awans). Zwycięzca tego starcia trafia/zostaje w wyższej dywizji, przegrany w niższej.",
      },
      {
        type: "subheading",
        text: "4.2. Rozstrzyganie Remisów w Barażach",
      },
      {
        type: "paragraph",
        text: 'Ponieważ mecz barażowy musi wyłonić zwycięzcę, w przypadku remisu punktowego po odjęciu kosztów transferów, stosujemy chronologiczną sekwencję "tie-breakerów":',
      },
      {
        type: "list",
        items: [
          "Większa liczba goli (Oficjalna zasada FPL Cup): Zwycięża gracz, którego zawodnicy z podstawowej jedenastki (XI) strzelili w danej kolejce więcej goli.",
          "Mniej goli straconych (Oficjalna zasada FPL Cup): Jeśli nadal jest remis, zwycięża gracz, którego Bramkarz i Obrońcy z podstawowej jedenastki (XI) stracili mniej goli.",
          "Więcej punktów na ławce rezerwowych (Dodatkowa zasada zabezpieczająca): Jeśli powyższe kryteria nie przyniosą rozstrzygnięcia, zwycięża gracz, którego zawodnicy na ławce rezerwowych zdobyli łącznie więcej punktów w danej kolejce.",
          "Wirtualny Rzut Monetą (Oficjalna zasada FPL Cup): W skrajnych przypadkach, przy absolutnym remisie we wszystkich powyższych statystykach, o ostatecznym zwycięstwie decyduje losowanie (Virtual coin toss).",
        ],
      },
      {
        type: "subheading",
        text: "4.3. Zasada Awansów Kaskadowych (Rezygnacja z gry)",
      },
      {
        type: "paragraph",
        text: "W przypadku, gdy po pełnym roku (2 sezonach) jakikolwiek gracz zrezygnuje z dalszej gry, nie ratujemy przed spadkiem graczy z miejsc 9–10 (spadki są nieodwołalne). Wolne luki wypełniamy stosując system awansów kaskadowych – dociągając do góry najlepszych graczy z niższych szczebli, którzy nie wywalczyli bezpośredniego awansu. Zupełnie nowi gracze, dołączający do społeczności, zawsze zaczynają zmagania od najniższej dywizji.",
      },
      {
        type: "list",
        items: [
          "Przykład 1 (Pojedyncza rezygnacja – Efekt domina): Z gry rezygnuje zawodnik, który zapewnił sobie utrzymanie w Dywizji 1. Wolne miejsce po nim zajmuje gracz z Dywizji 2, który był \"pierwszy w kolejce\" do awansu (najczęściej przegrany z barażów, czyli gracz z 3. miejsca). Aby uzupełnić powstałą lukę w Dywizji 2, awansuje do niej gracz z 3. miejsca w Dywizji 3 – kaskada przesuwa się w dół aż do najniższej ligi.",
          "Przykład 2 (Rezygnacja większej liczby graczy): Po sezonie z gry odchodzi aż trzech graczy z Dywizji 2. W takiej sytuacji z Dywizji 3 awansuje kaskadowo nie jeden, ale aż trzech dodatkowych graczy (np. gracze z miejsc 3, 4 i 5), aby wyrównać skład Dywizji 2 do pełnych 10 zespołów. W efekcie do Dywizji 3 z Dywizji 4 również przechodzi dodatkowych trzech graczy.",
          "Przykład 3 (Rezygnacja a los Spadkowicza): Gracz zajmuje 9. miejsce w Dywizji 2, co oznacza jego bezpośredni spadek. W tym samym czasie inny zawodnik utrzymany w Dywizji 2 ogłasza rezygnację. Gracz z 9. miejsca NIE ZACHOWUJE swojego bytu w lidze – zostaje bezwzględnie zdegradowany. Wolne miejsce po rezygnującym graczu przypada w nagrodę dodatkowemu zawodnikowi awansującemu z Dywizji 3.",
          "Przykład 4 (Rezygnacja gracza zdegradowanego): Zawodnik zajmuje 10. miejsce w Dywizji 1, co oznacza spadek do Dywizji 2. Po sezonie ogłasza, że całkowicie rezygnuje z gry. Ponieważ jego spadek był nieodwołalny, on sam \"zapełniałby\" w nowym sezonie miejsce w Dywizji 2. Jego odejście tworzy więc lukę w Dywizji 2, a nie w Dywizji 1. Z tego powodu awans kaskadowy otrzymuje najlepszy nieawansowany gracz z Dywizji 3 (przechodząc do Dywizji 2), co przesuwa kaskadę odpowiednio w dół.",
        ],
      },
    ],
  },
  {
    id: "puchar",
    title: "5. WIELKI PUCHAR (THE FA CUP)",
    blocks: [
      {
        type: "list",
        items: [
          "Zasięg: Udział biorą w nim wszyscy gracze bez względu na szczebel ligowy.",
          "Automatyzacja: Puchar rozgrywany jest automatycznie wewnątrz oficjalnej aplikacji FPL jako wbudowany League Cup dla naszej powiązanej ligi Classic. Startuje zazwyczaj w drugiej połowie sezonu, a jego finał odbywa się w GW38.",
          "Losowanie: Drabinka i przydział par do poszczególnych rund generowane są ślepo przez samą grę.",
          "Remisy w pucharze: Ponieważ cały puchar obsługiwany jest przez system FPL, w przypadku remisów punktowych w meczach pucharowych obowiązują wyłącznie oficjalne zasady rozstrzygania wbudowane w grę (FPL Cup tie-breaks), na które administracja ligi nie ma wpływu.",
          "Nagrody: Na dzień dzisiejszy nie przewidujemy nagród rzeczowych za wygranie pucharu. Zwycięzca Wielkiego Pucharu trafia do serwerowej Galeri Sław (Hall of Fame) społeczności „Na Minusie ™” i otrzymuje specjalne wyróżnienie na serwerze.",
        ],
      },
    ],
  },
  {
    id: "admin",
    title: "6. ADMINISTRACJA I WYNIKI",
    blocks: [
      {
        type: "list",
        items: [
          "Jeden profil, jedna liga: Gracze zakładają standardowy skład w FPL i dołączają tylko do jednej, wspólnej Ligi Classic wskazanej przez administrację (The FA Ranking).",
          "Identyfikacja i Mapowanie graczy: Prowadząc ligę i komunikując się ze społecznością, będziemy opierać się przede wszystkim na wybranym przez Ciebie Klubie z Discorda oraz Twoim Nicku z Discorda. Często też będziemy do powyższych dopisywać Nazwę drużyny w FPL oraz Nazwę Menedżera z FPL (imię i nazwisko lub wpisany w grze pseudonim) w celu mapowania wyników lub technicznego rozróżnienia menedżerów.",
          "Losowanie i Terminarz: Terminarz generowany jest w oparciu o tabele Bergera. Przed startem każdego sezonu odbywa się zautomatyzowane losowanie par przypisujących menedżerów do poszczególnych pozycji w terminarzu wewnątrz ich dywizji.",
          "Automatyzacja: Całym procesem pobierania wyników, obliczania mediany, dodawania bonusów i generowania klasyfikacji dywizyjnych zajmuje się administracja. Wyniki H2H będą regularnie publikowane na serwerze Discord.",
          "Wyróżnienia Classic: Całoroczna liga Classic służy jako baza do pobierania wyników. Zwycięstwo w klasycznej tabeli ogólnej nie wiąże się z nagrodą rzeczową, lecz gwarantuje wpis do serwerowej Galeri Sław (Hall of Fame) i prestiżowy tytuł Menedżera Roku.",
          "Społeczność: Gracze zobowiązani są do śledzenia ogłoszeń na Discordzie. To tam toczy się główne życie ligi, trash-talk przedmeczowy i wspólne przeżywanie Baraży!",
        ],
      },
      {
        type: "paragraph",
        text: "Administracja Ligi „Na Minusie ™” zastrzega sobie prawo do ostatecznej interpretacji niniejszego regulaminu w przypadku sytuacji nieprzewidzianych.",
      },
    ],
  },
  {
    id: "harmonogram",
    title: "7. HARMONOGRAM STARTU SEZONU 2026/2027",
    blocks: [
      {
        type: "list",
        items: [
          "Do 9 sierpnia 2026 (godz. 23:59) – Zamknięcie głównego formularza zgłoszeniowego.",
          "Do 3 dni od zgłoszenia – Regulaminowy czas na dokonanie wpłaty BLIK.",
          "Do 24 godzin od otrzymania kodu – Rygorystyczny czas na dołączenie do Ligi Classic „Na Minusie ™”.",
          "Do 21 sierpnia 2026 (godz. 19:30) – Ewentualna rekrutacja uzupełniająca (awaryjna) na zwolnione miejsca.",
          "21 sierpnia 2026 (godz. 19:30 czasu polskiego) – Twardy deadline 1. kolejki FPL (GW1) i oficjalny start naszej rywalizacji.",
        ],
      },
    ],
  },
];
