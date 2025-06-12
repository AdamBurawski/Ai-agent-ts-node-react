# Dokument Wymagań Produktu (PRD) – AI Agent

## 1. Przegląd produktu

Projekt "AI Agent" to interaktywna aplikacja webowa, która pełni rolę wszechstronnego asystenta AI. Agent jest zdolny do prowadzenia konwersacji, zarządzania dedykowaną bazą wiedzy, interakcji z zewnętrznymi bazami danych (SQL i grafowymi) oraz pozyskiwania informacji z internetu poprzez web scraping. Aplikacja umożliwia również zaawansowane interakcje, takie jak przetwarzanie audio i wizualizację danych.

## 2. Problem użytkownika

Użytkownicy i deweloperzy potrzebują jednego, zintegrowanego narzędzia, które potrafi nie tylko odpowiadać na pytania, ale również aktywnie pozyskiwać, przetwarzać i prezentować dane z różnych źródeł. Tradycyjne chatboty są ograniczone do swojej wstępnej wiedzy. To rozwiązanie ma na celu stworzenie agenta, który dynamicznie rozszerza swoje możliwości poprzez interakcję z bazami danych i treściami online, stając się potężnym narzędziem do analizy i pracy z danymi.

## 3. Wymagania funkcjonalne

Na podstawie analizy kodu zidentyfikowano następujące funkcjonalności:

1.  **Rdzeń Agenta AI:**

    - Przetwarzanie zapytań użytkownika w języku naturalnym.
    - Prowadzenie historii konwersacji z możliwością jej przeglądania i czyszczenia.
    - Orkiestracja zadań i delegowanie ich do odpowiednich modułów (Baza Wiedzy, Agent SQL, Scraper).

2.  **Baza Wiedzy (Knowledge Base):**

    - Umożliwia przechowywanie informacji w postaci "wspomnień" (memories).
    - Obsługuje wyszukiwanie semantyczne w zgromadzonej wiedzy.
    - Pozwala na zarządzanie wspomnieniami (tworzenie, odczyt, aktualizacja, usuwanie - CRUD).
    - Umożliwia grupowanie wspomnień w kategorie.
    - Udostępnia statystyki dotyczące zawartości bazy wiedzy.
    - Posiada funkcję masowego importu danych.

3.  **Agent SQL:**

    - Potrafi analizować strukturę połączonej bazy danych SQL (listować tabele, kolumny).
    - Umożliwia generowanie zapytań SQL na podstawie poleceń w języku naturalnym.
    - Pozwala na bezpośrednie wykonywanie zapytań SQL i zwracanie wyników.

4.  **Agent Scrapera:**

    - Inicjalizuje proces scrapowania na podanym URL.
    - Przechodzi przez strony (crawluje), zbierając dane.
    - Udostępnia status procesu scrapowania.
    - Umożliwia przeszukiwanie i odpytywanie zebranych treści.

5.  **Przetwarzanie Audio i Wizualizacja:**

    - Interfejs frontendowy posiada zdolność do nagrywania i przetwarzania audio (wnioskowane z bibliotek `recordrtc`, `ffmpeg`), prawdopodobnie w celu przesyłania poleceń głosowych.
    - Aplikacja umożliwia renderowanie wizualizacji danych w postaci wykresów (`chart.js`) oraz sieci/grafów (`vis-network`).

6.  **Agent Grafowy (Neo4j):**

    - Umożliwia importowanie danych w celu budowy struktury grafu.
    - Pozwala na odpytywanie o bezpośrednie połączenia (krawędzie) dla danego węzła.
    - Posiada funkcjonalność znajdowania najkrótszej ścieżki pomiędzy dwoma węzłami w grafie.

7.  **Agent Wektorowy:**

    - Potrafi generować wektorowe reprezentacje (embeddings) dla danych tekstowych.
    - Umożliwia przeprowadzanie zapytań wektorowych w celu znalezienia semantycznie podobnych informacji.
    - Posiada zdolność do tworzenia podsumowań na podstawie znalezionych danych.

8.  **Uwierzytelnianie i Zarządzanie Kontem Użytkownika:**
    - System zapewnia mechanizmy rejestracji i logowania przy użyciu adresu e-mail i hasła.
    - Każdy zalogowany użytkownik ma dostęp wyłącznie do swoich zasobów (historii konwersacji, baz wiedzy, wyników zapytań). Dane są odizolowane od innych użytkowników.
    - Użytkownik ma możliwość zresetowania zapomnianego hasła.
    - Użytkownik może usunąć swoje konto, co powoduje trwałe usunięcie wszystkich powiązanych z nim danych.

## 4. Granice produktu (na podstawie kodu)

- **Brak funkcji współdzielenia:** Brak możliwości współpracy i udostępniania zasobów (np. baz wiedzy) pomiędzy różnymi użytkownikami.
- **Ograniczenia interfejsu:** Funkcjonalności są udostępnione przez API backendu; stopień ich implementacji w UI frontendu może być różny.

## 5. Bezpieczny Dostęp i Uwierzytelnianie

- **Tytuł:** Bezpieczny dostęp i zarządzanie kontem
- **Opis:** Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych.
- **Kryteria akceptacji:**
  - Korzystanie z aplikacji i jej głównych funkcjonalności (baza wiedzy, agenci) wymaga rejestracji i zalogowania.
  - Logowanie i rejestracja odbywają się na dedykowanych stronach i wymagają podania adresu e-mail oraz hasła.
  - System nie korzysta z zewnętrznych dostawców tożsamości (np. Google, GitHub).
  - Zapewniony jest mechanizm odzyskiwania zapomnianego hasła.
  - Hasła użytkowników są przechowywane w bezpieczny, zaszyfrowany sposób.

## 6. Historyjki użytkowników (przykładowe, oparte na funkcjonalności)

**ID: US-001**
**Tytuł:** Prowadzenie konwersacji z Agentem
**Opis:** Jako zalogowany użytkownik chcę zadać pytanie agentowi i otrzymać odpowiedź, a także móc przejrzeć historię naszej rozmowy.
**Kryteria akceptacji:**

- Mogę wysłać zapytanie do endpointu `/api/agent/process`.
- Mogę pobrać historię rozmowy z `/api/agent/history`.
- Mogę wyczyścić historię rozmowy przez `/api/agent/history`.

**ID: US-002**
**Tytuł:** Dodawanie wiedzy do bazy Agenta
**Opis:** Jako zalogowany użytkownik chcę zapisać nową informację (pamięć) w bazie wiedzy, aby agent mógł z niej korzystać w przyszłości.
**Kryteria akceptacji:**

- Mogę wysłać nową "pamięć" do endpointu `/api/knowledge/memories`.
- Informacja jest zapisywana w tabeli `memories` w bazie danych i jest powiązana z moim kontem.

**ID: US-003**
**Tytuł:** Wyszukiwanie informacji w bazie wiedzy
**Opis:** Jako zalogowany użytkownik chcę przeszukać bazę wiedzy agenta, aby znaleźć relevantne informacje na dany temat.
**Kryteria akceptacji:**

- Mogę wysłać zapytanie wyszukiwania do `/api/knowledge/search`.
- Otrzymuję listę pasujących "wspomnień" z mojej bazy wiedzy, posortowaną według trafności.

**ID: US-004**
**Tytuł:** Zapytanie do bazy danych w języku naturalnym
**Opis:** Jako zalogowany użytkownik chcę zadać pytanie dotyczące danych w bazie SQL (np. "pokaż mi ostatnich 5 klientów"), a agent ma wygenerować i wykonać odpowiednie zapytanie.
**Kryteria akceptacji:**

- Wysyłam polecenie w języku naturalnym do `/api/sql/generate-sql`.
- Agent zwraca poprawny kod SQL.
- Mogę następnie wykonać ten kod przez `/api/sql/query-database` i otrzymać wyniki.

**ID: US-005**
**Tytuł:** Zlecenie Agentowi zebrania danych ze strony internetowej
**Opis:** Jako zalogowany użytkownik chcę podać agentowi adres URL i poprosić go o zebranie treści z tej strony, aby móc później o nią pytać.
**Kryteria akceptacji:**

- Inicjalizuję scrapera przez `/api/scraper/init` z docelowym URL.
- Uruchamiam proces przez `/api/scraper/crawl`.
- Mogę sprawdzić status w `/api/scraper/status`.
- Mogę przeszukiwać zebrane dane przez `/api/scraper/query` lub `/api/scraper/search`.

**ID: US-006**
**Tytuł:** Przesłanie zapytania głosowego
**Opis:** Jako zalogowany użytkownik chcę nagrać swoje pytanie za pomocą mikrofonu w interfejsie aplikacji, aby uniknąć pisania.
**Kryteria akceptacji:**

- UI frontendu pozwala na nagranie audio.
- Nagranie jest przetwarzane (np. do formatu MP3) i wysyłane do backendu (np. do transkrypcji przez API `openai`).

**ID: US-007**
**Tytuł:** Wizualizacja relacji w danych
**Opis:** Jako zalogowany użytkownik, po wykonaniu zapytania do bazy grafowej Neo4j, chcę zobaczyć wyniki w formie interaktywnego grafu.
**Kryteria akceptacji:**

- Dane z backendu (np. z `neo4j-driver`) są przekazywane do frontendu.
- Frontend renderuje graf, używając biblioteki `vis-network`, pokazując węzły i krawędzie.

**ID: US-008**
**Tytuł:** Analiza relacji w grafie
**Opis:** Jako zalogowany użytkownik chcę znaleźć najkrótszą ścieżkę między dwoma pojęciami w bazie grafowej, aby zrozumieć ich powiązanie.
**Kryteria akceptacji:**

- Mogę wysłać żądanie znalezienia najkrótszej ścieżki przez endpoint `/api/graph/shortest-path`, podając dwa węzły.
- Otrzymuję w odpowiedzi sekwencję węzłów i krawędzi tworzących ścieżkę.

**ID: US-009**
**Tytuł:** Tworzenie podsumowania na podstawie podobnych dokumentów
**Opis:** Jako zalogowany użytkownik chcę zadać pytanie, a następnie otrzymać zwięzłe podsumowanie wygenerowane na podstawie najbardziej podobnych dokumentów znalezionych w bazie wektorowej.
**Kryteria akceptacji:**

- Mogę wysłać zapytanie do endpointu `/api/vector/query`, aby znaleźć podobne dane.
- Mogę użyć wyników (lub bezpośrednio zapytania) w endpoincie `/api/vector/summary`, aby otrzymać wygenerowane podsumowanie.

**ID: US-010**
**Tytuł:** Rejestracja nowego konta
**Opis:** Jako nowy użytkownik chcę móc się zarejestrować, podając e-mail i hasło, aby uzyskać dostęp do platformy.
**Kryteria akceptacji:**

- Formularz rejestracji wymaga podania adresu e-mail i hasła (z potwierdzeniem).
- Po pomyślnej rejestracji konto jest aktywne, a ja zostaję automatycznie zalogowany.

**ID: US-011**
**Tytuł:** Logowanie do systemu
**Opis:** Jako zarejestrowany użytkownik chcę się zalogować, aby uzyskać dostęp do moich danych i funkcjonalności agenta.
**Kryteria akceptacji:**

- Formularz logowania wymaga podania e-maila i hasła.
- Po poprawnym zalogowaniu uzyskuję dostęp do swojego panelu.
- W przypadku błędnych danych otrzymuję stosowny komunikat.

**ID: US-012**
**Tytuł:** Izolacja danych użytkownika
**Opis:** Jako zalogowany użytkownik chcę mieć pewność, że moje dane (bazy wiedzy, historia) są prywatne i niedostępne dla innych użytkowników.
**Kryteria akceptacji:**

- Wszystkie zapytania do API zwracają tylko dane powiązane z moim kontem użytkownika.
- Nie ma możliwości odpytania o zasoby innego użytkownika.

**ID: US-013**
**Tytuł:** Odzyskiwanie zapomnianego hasła
**Opis:** Jako użytkownik, który zapomniał hasła, chcę mieć możliwość jego zresetowania, aby odzyskać dostęp do konta.
**Kryteria akceptacji:**

- Na stronie logowania znajduje się link "Zapomniałem hasła".
- Po podaniu adresu e-mail otrzymuję na niego link z instrukcją do zresetowania hasła.
- Link do resetu jest jednorazowy i ma ograniczony czas ważności.

## 7. Metryki sukcesu (proponowane)

1.  **Skuteczność Agenta:**
    - Procent zapytań, na które agent udzielił poprawnej odpowiedzi, wykorzystując odpowiednie narzędzie (baza wiedzy, SQL, scraper).
2.  **Użycie Bazy Wiedzy:**
    - Stosunek liczby odczytów (zapytań) do liczby zapisów do bazy wiedzy.
    - Liczba unikalnych kategorii i zaimportowanych dokumentów.
3.  **Zaangażowanie w funkcje zaawansowane:**
    - Częstotliwość użycia agenta SQL i Scrapera.
    - Liczba wykonanych wizualizacji danych.
4.  **Aktywność Użytkowników:**
    - Liczba nowo zarejestrowanych kont.
    - Stosunek dziennych aktywnych użytkowników do miesięcznych aktywnych użytkowników (DAU/MAU).
