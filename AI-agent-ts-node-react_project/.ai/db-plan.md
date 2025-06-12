# Plan Bazy Danych PostgreSQL (Supabase)

## 1. Lista Tabel

Poniżej znajduje się definicja tabel, typów danych i ograniczeń dla projektu AI Agent.

### Typy niestandardowe (ENUMs)

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant');
CREATE TYPE agent_type AS ENUM ('SQL', 'Scraper', 'Graph', 'Vector');
CREATE TYPE log_status AS ENUM ('started', 'completed', 'failed');
```

---

### Tabela: `profiles`

Przechowuje publiczne dane użytkowników, rozszerzając wbudowaną tabelę `auth.users` w Supabase.

| Nazwa Kolumny | Typ Danych    | Ograniczenia                                             | Opis                                               |
| ------------- | ------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `id`          | `uuid`        | `PRIMARY KEY`, `REFERENCES auth.users ON DELETE CASCADE` | Klucz główny, powiązany z `auth.users.id`.         |
| `role`        | `text`        | `NOT NULL`, `DEFAULT 'user'`                             | Rola użytkownika w systemie (np. 'user', 'admin'). |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                              | Znacznik czasu utworzenia profilu.                 |
| `updated_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                              | Znacznik czasu ostatniej aktualizacji profilu.     |

---

### Tabela: `conversations`

Przechowuje metadane dla każdej sesji konwersacyjnej.

| Nazwa Kolumny | Typ Danych    | Ograniczenia                                          | Opis                                                 |
| ------------- | ------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `id`          | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`            | Unikalny identyfikator konwersacji.                  |
| `user_id`     | `uuid`        | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE` | ID użytkownika, który jest właścicielem konwersacji. |
| `title`       | `text`        |                                                       | Opcjonalny tytuł konwersacji.                        |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                           | Znacznik czasu utworzenia konwersacji.               |
| `updated_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                           | Znacznik czasu ostatniej aktualizacji.               |

---

### Tabela: `messages`

Przechowuje poszczególne wiadomości w ramach konwersacji.

| Nazwa Kolumny     | Typ Danych     | Ograniczenia                                             | Opis                                                |
| ----------------- | -------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `id`              | `uuid`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`               | Unikalny identyfikator wiadomości.                  |
| `conversation_id` | `uuid`         | `NOT NULL`, `REFERENCES conversations ON DELETE CASCADE` | ID konwersacji, do której należy wiadomość.         |
| `user_id`         | `uuid`         | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE`    | ID użytkownika, który jest właścicielem wiadomości. |
| `role`            | `message_role` | `NOT NULL`                                               | Rola autora wiadomości (`user` lub `assistant`).    |
| `content`         | `text`         | `NOT NULL`                                               | Treść wiadomości.                                   |
| `created_at`      | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                              | Znacznik czasu utworzenia wiadomości.               |

---

### Tabela: `memories`

Przechowuje metadane dla "wspomnień" w bazie wiedzy.

| Nazwa Kolumny | Typ Danych    | Ograniczenia                                                | Opis                                           |
| ------------- | ------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `id`          | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                  | Unikalny identyfikator "wspomnienia".          |
| `user_id`     | `uuid`        | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE`       | ID użytkownika, który jest właścicielem wpisu. |
| `title`       | `text`        |                                                             | Opcjonalny tytuł.                              |
| `source`      | `text`        |                                                             | Źródło informacji (np. URL, nazwa pliku).      |
| `tags`        | `text[]`      |                                                             | Tagi ułatwiające kategoryzację.                |
| `importance`  | `smallint`    | `DEFAULT 1`, `CHECK (importance >= 1 AND importance <= 10)` | Poziom ważności "wspomnienia" w skali 1-10.    |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                 | Znacznik czasu utworzenia.                     |
| `updated_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                 | Znacznik czasu ostatniej aktualizacji.         |

---

### Tabela: `memory_chunks`

Przechowuje fragmenty tekstu "wspomnień" wraz z ich wektorowymi reprezentacjami.

| Nazwa Kolumny | Typ Danych     | Ograniczenia                                          | Opis                                                                        |
| ------------- | -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `id`          | `uuid`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`            | Unikalny identyfikator fragmentu.                                           |
| `memory_id`   | `uuid`         | `NOT NULL`, `REFERENCES memories ON DELETE CASCADE`   | ID "wspomnienia", do którego należy fragment.                               |
| `user_id`     | `uuid`         | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE` | ID użytkownika (denormalizacja dla łatwiejszych polityk RLS).               |
| `content`     | `text`         | `NOT NULL`                                            | Treść fragmentu tekstu.                                                     |
| `embedding`   | `vector(1536)` |                                                       | Wektorowa reprezentacja treści (embedding). Wymaga rozszerzenia `pgvector`. |
| `created_at`  | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                           | Znacznik czasu utworzenia.                                                  |

---

### Tabela: `categories`

Kategorie zdefiniowane przez użytkownika do grupowania "wspomnień".

| Nazwa Kolumny | Typ Danych    | Ograniczenia                                          | Opis                                                      |
| ------------- | ------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `id`          | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`            | Unikalny identyfikator kategorii.                         |
| `user_id`     | `uuid`        | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE` | ID użytkownika, właściciela kategorii.                    |
| `name`        | `text`        | `NOT NULL`                                            | Nazwa kategorii.                                          |
| `description` | `text`        |                                                       | Opcjonalny opis kategorii.                                |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                           | Znacznik czasu utworzenia.                                |
|               |               | `UNIQUE (user_id, name)`                              | Nazwa kategorii musi być unikalna dla danego użytkownika. |

---

### Tabela: `memory_categories` (Tabela łącząca)

Realizuje relację wiele-do-wielu między `memories` a `categories`.

| Nazwa Kolumny | Typ Danych | Ograniczenia                                             | Opis                          |
| ------------- | ---------- | -------------------------------------------------------- | ----------------------------- |
| `memory_id`   | `uuid`     | `PRIMARY KEY`, `REFERENCES memories ON DELETE CASCADE`   | ID powiązanego "wspomnienia". |
| `category_id` | `uuid`     | `PRIMARY KEY`, `REFERENCES categories ON DELETE CASCADE` | ID powiązanej kategorii.      |

---

### Tabela: `agent_logs`

Rejestruje interakcje z różnymi agentami (SQL, Scraper, Graph).

| Nazwa Kolumny   | Typ Danych    | Ograniczenia                                          | Opis                                       |
| --------------- | ------------- | ----------------------------------------------------- | ------------------------------------------ |
| `id`            | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`            | Unikalny identyfikator logu.               |
| `user_id`       | `uuid`        | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE` | ID użytkownika, który zainicjował akcję.   |
| `agent_type`    | `agent_type`  | `NOT NULL`                                            | Typ agenta, który był użyty.               |
| `input_data`    | `jsonb`       |                                                       | Dane wejściowe dla agenta (np. zapytanie). |
| `output_data`   | `jsonb`       |                                                       | Dane wyjściowe od agenta (np. wynik).      |
| `status`        | `log_status`  | `NOT NULL`                                            | Status operacji.                           |
| `error_message` | `text`        |                                                       | Komunikat błędu w przypadku niepowodzenia. |
| `started_at`    | `timestamptz` | `NOT NULL`, `DEFAULT now()`                           | Czas rozpoczęcia operacji.                 |
| `ended_at`      | `timestamptz` |                                                       | Czas zakończenia operacji.                 |

---

### Tabela: `search_history`

Przechowuje historię zapytań wyszukiwania użytkownika.

| Nazwa Kolumny | Typ Danych    | Ograniczenia                                          | Opis                                     |
| ------------- | ------------- | ----------------------------------------------------- | ---------------------------------------- |
| `id`          | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`            | Unikalny identyfikator wpisu.            |
| `user_id`     | `uuid`        | `NOT NULL`, `REFERENCES auth.users ON DELETE CASCADE` | ID użytkownika, który wykonał zapytanie. |
| `query`       | `text`        | `NOT NULL`                                            | Treść zapytania.                         |
| `created_at`  | `timestamptz` | `NOT NULL`, `DEFAULT now()`                           | Znacznik czasu wykonania zapytania.      |

## 2. Relacje Między Tabelami

- **Użytkownicy (`auth.users` <-> `profiles`)**: **Jeden-do-jednego**. Każdy użytkownik w `auth.users` ma jeden profil w `profiles`.
- **Użytkownicy i Konwersacje (`auth.users` <-> `conversations`)**: **Jeden-do-wielu**. Użytkownik może mieć wiele konwersacji.
- **Konwersacje i Wiadomości (`conversations` <-> `messages`)**: **Jeden-do-wielu**. Konwersacja składa się z wielu wiadomości.
- **Użytkownicy i "Wspomnienia" (`auth.users` <-> `memories`)**: **Jeden-do-wielu**. Użytkownik może mieć wiele "wspomnień".
- **"Wspomnienia" i Fragmenty (`memories` <-> `memory_chunks`)**: **Jeden-do-wielu**. "Wspomnienie" jest podzielone na wiele fragmentów.
- **Użytkownicy i Kategorie (`auth.users` <-> `categories`)**: **Jeden-do-wielu**. Użytkownik może zdefiniować wiele kategorii.
- **"Wspomnienia" i Kategorie (`memories` <-> `categories`)**: **Wiele-do-wielu**, zrealizowane przez tabelę łączącą `memory_categories`.
- **Użytkownicy i Logi/Historia (`auth.users` <-> `agent_logs`, `search_history`)**: **Jeden-do-wielu**. Aktywności użytkownika są logowane w wielu wpisach.

## 3. Indeksy

Klucze podstawowe i obce są automatycznie indeksowane. Poniżej znajdują się dodatkowe indeksy w celu poprawy wydajności.

```sql
-- Indeks dla wydajnego wyszukiwania wektorowego
CREATE INDEX ON memory_chunks USING hnsw (embedding vector_l2_ops);

-- Indeksy dla kluczy obcych i często filtrowanych kolumn
CREATE INDEX ON conversations (user_id);
CREATE INDEX ON messages (conversation_id);
CREATE INDEX ON messages (user_id);
CREATE INDEX ON memories (user_id);
CREATE INDEX ON memory_chunks (memory_id);
CREATE INDEX ON memory_chunks (user_id);
CREATE INDEX ON categories (user_id);
CREATE INDEX ON agent_logs (user_id);
CREATE INDEX ON agent_logs (agent_type, status);
CREATE INDEX ON search_history (user_id);
```

## 4. Zasady Bezpieczeństwa na Poziomie Wiersza (RLS)

Dla każdej tabeli zawierającej dane użytkownika należy włączyć RLS i zdefiniować polityki zapewniające izolację danych.

```sql
-- Ogólny szablon polityki (należy zastosować do każdej tabeli z kolumną user_id)
-- Nazwę tabeli `table_name` należy zastąpić docelową nazwą.

-- 1. Włącz RLS dla tabeli
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 2. Zdefiniuj politykę dla operacji SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Users can manage their own data"
ON table_name
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Polityka dla tabeli `profiles` (używa kolumny `id` zamiast `user_id`)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile"
ON profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Polityka dla tabeli `memory_categories` (sprawdza własność na powiązanych tabelach)
ALTER TABLE memory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage links for their own memories"
ON memory_categories
FOR ALL
USING (
  (SELECT auth.uid()) = (SELECT user_id FROM memories WHERE id = memory_id)
);
```

**Tabele wymagające polityk RLS:** `profiles`, `conversations`, `messages`, `memories`, `memory_chunks`, `categories`, `memory_categories`, `agent_logs`, `search_history`.

## 5. Dodatkowe Uwagi

1.  **Rozszerzenie `pgvector`**: Przed utworzeniem tabeli `memory_chunks` należy upewnić się, że rozszerzenie `vector` jest aktywne w bazie danych Supabase. Można to zrobić za pomocą polecenia `CREATE EXTENSION IF NOT EXISTS vector;`.
2.  **Funkcje Triggerowe**: Warto rozważyć użycie triggerów do automatycznej aktualizacji pól `updated_at` przy każdej modyfikacji wiersza, aby zapewnić spójność danych.
3.  **Kaskadowe usuwanie (`ON DELETE CASCADE`)**: Klucze obce zostały skonfigurowane z opcją `ON DELETE CASCADE`. Oznacza to, że usunięcie rekordu nadrzędnego (np. użytkownika z `auth.users`) spowoduje automatyczne usunięcie wszystkich powiązanych z nim rekordów w tabelach podrzędnych (np. jego konwersacji, wspomnień, logów). Jest to kluczowe dla zachowania integralności danych i realizacji prawa do bycia zapomnianym.
4.  **Typ `jsonb`**: Użycie `jsonb` w tabeli `agent_logs` jest celowe. Oferuje on lepszą wydajność i możliwość indeksowania w porównaniu do typu `text` czy `json`.
5.  **Normalizacja vs Denormalizacja**: Kolumna `user_id` w tabeli `memory_chunks` jest przykładem celowej denormalizacji. Chociaż `user_id` można by uzyskać przez złączenie z tabelą `memories`, jego obecność w `memory_chunks` znacznie upraszcza definicję i egzekwowanie polityk RLS, co przekłada się na lepsze bezpieczeństwo i potencjalnie większą wydajność przy sprawdzaniu uprawnień.
