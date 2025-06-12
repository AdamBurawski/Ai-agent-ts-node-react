### Stos Technologiczny Projektu

Poniższy dokument opisuje technologie zidentyfikowane w kodzie źródłowym aplikacji.

### Frontend (`/frontend`)

- **Framework**: React.js (`react`, `react-dom`)
- **Język**: TypeScript
- **Narzędzie budowania**: Vite (`vite`, `@vitejs/plugin-react-swc`)
- **Styling**:
  - Tailwind CSS (wnioskowane z `tailwind-merge` i `class-variance-authority`)
  - SASS (`sass`)
- **Biblioteki UI i komponenty**:
  - `lucide-react` (ikony)
  - `shadcn/ui` (biblioteka komponentów)
- **Wizualizacja Danych**:
  - `chart.js` (wykresy)
  - `vis-network` (wizualizacje sieciowe/grafowe)
- **Przetwarzanie Audio**:
  - `recordrtc`: nagrywanie audio/wideo
  - `hark`: detekcja mowy
  - `@ffmpeg/ffmpeg` & `lamejs`: przetwarzanie i enkodowanie audio
- **Linting**: ESLint (`eslint`)

### Backend (`/backend`)

- **Środowisko uruchomieniowe**: Node.js
- **Framework**: Express.js (`express`)
- **Język**: TypeScript (`typescript`, `ts-node`)
- **Bazy Danych (sterowniki)**:
  - `PostgreSQL`: Klient dla baz danych
  - `neo4j-driver`: Klient dla grafowej bazy danych Neo4j.
- **Integracja AI**:
  - `openai`: Oficjalna biblioteka kliencka OpenAI.
- **Web Scraping / Parsowanie HTML**:
  - `cheerio`
  - `jsdom`
- **Obsługa zapytań HTTP**: `axios`
- **Obsługa przesyłania plików**:
  - `multer`
  - `formidable`
- **Inne**:
  - `cors`: Obsługa Cross-Origin Resource Sharing.
  - `dotenv`: Zarządzanie zmiennymi środowiskowymi.

### CI/CD i Hosting

- **CI/CD**: GitHub Actions do automatyzacji procesów budowania, testowania i wdrażania aplikacji.
- **Hosting**:
  - **Frontend**: Netlify do szybkiego i globalnie dystrybuowanego hostingu statycznego.
  - **Backend**: Do ustalenia (np. DigitalOcean, Heroku, AWS) w zależności od wymagań dotyczących bazy danych i skalowalności.

### Testowanie

- **Backend (API)**: Supertest i Jest/Vitest do testów integracyjnych i jednostkowych punktów końcowych API.
- **Frontend**:
  - **Testy jednostkowe/integracyjne**: Vitest/Jest i React Testing Library do testowania logiki i komponentów React.
  - **Testy End-to-End**: Playwright do automatyzacji testów w przeglądarce, symulujących interakcje użytkownika.
