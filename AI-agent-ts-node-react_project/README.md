# AI Agent TS-Node-React

A full-stack application featuring a React frontend and a Node.js backend, designed to provide AI-powered agent capabilities.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

This project is a sophisticated AI agent built with a modern tech stack. The agent is capable of performing tasks like web scraping, data visualization, and interacting with users through a chat interface.

- **Frontend:** A dynamic and responsive user interface built with React and TypeScript, featuring various tools and components for user interaction.
- **Backend:** A robust backend powered by Node.js and Express, handling API requests, business logic, and interactions with databases and external services like OpenAI.

## Tech Stack

### Frontend

- **Framework:** React, Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS, SASS, Shadcn/UI
- **State Management/Hooks:** Custom hooks for API calls, chat, etc.
- **Libraries:** `axios`, `chart.js`, `vis-network`, `recordrtc`

### Backend

- **Framework:** Node.js, Express
- **Language:** TypeScript
- **Database:** MySQL, Neo4j
- **API:** RESTful API
- **Libraries:** `openai`, `cheerio`, `jsdom`, `multer`

### Tools

- **Linting:** ESLint
- **Build Tools:** Vite (frontend), TSC (backend)

## Getting Started Locally

### Prerequisites

- Node.js
- npm or yarn
- MySQL
- Neo4j (optional, for graph visualization features)

### Backend Setup

1.  Navigate to the backend directory:
    ```sh
    cd AI-agent-ts-node-react_project/backend
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Create a `.env` file in the `backend` directory and add the necessary environment variables. You can use `.env.example` as a template if available.
    ```
    PORT=3001
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=password
    DB_NAME=agent_db
    NEO4J_URI=neo4j://localhost
    NEO4J_USER=neo4j
    NEO4J_PASSWORD=password
    OPENAI_API_KEY=your_openai_api_key
    ```
4.  Start the development server:
    ```sh
    npm run dev
    ```

### Frontend Setup

1.  Navigate to the frontend directory:
    ```sh
    cd AI-agent-ts-node-react_project/frontend
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Start the development server:
    ```sh
    npm run dev
    ```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

## Available Scripts

### Backend

- `npm run start:dev`: Starts the development server with file watching.
- `npm run build`: Compiles TypeScript to JavaScript for production.
- `npm run start`: Runs the compiled production build.
- `npm run dev`: Starts the server using `ts-node` for development.
- `npm run clean`: Removes the `dist` directory.

### Frontend

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Lints the codebase.
- `npm run preview`: Previews the production build locally.

## Project Scope

The project aims to create a versatile AI agent with a web-based interface.

### Core Features

- Chat-based interaction with an AI.
- Web scraping capabilities.
- Graph visualization of data.
- Audio processing.
- SQL query execution.

## Project Status

**Status:** In Development

This project is currently under active development. Core features are being implemented and refined.

## License

This project is **Copyrighted**.
