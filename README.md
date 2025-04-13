# Ambient Clock

Transform your screen into a beautiful, dynamic timepiece with Ambient Clock! More than just a clock, it's a customizable visual experience perfect for a secondary monitor, casting to a TV, or any display where you want both function and beauty. Enjoy stunning, automatically rotating backgrounds from multiple sources (Unsplash, Pexels, Pixabay, Peapix) paired with elegant clock styles (Digital, Analog). Personalize colors, effects, and layouts for a quick glance at the time or simply to admire the view. Built with a modern design, it's visually captivating and easy to use.

## Features

*   **Modern Architecture:** Refactored using ES Modules, component-based structure, centralized state management (`StateManager`), and event bus (`EventBus`).
*   **Multiple Clock Faces:**
    *   Clean
    *   Analog (Rendered with SVG for crisp scaling)
*   **Customizable Backgrounds:**
    *   Image providers: Unsplash, Pexels, Pixabay, Peapix (via backend proxy - no client API keys needed!)
    *   Persistent `localStorage` caching of image batches to reduce API calls across sessions.
    *   Solid Color overlay option with color picker.
    *   Automatic background cycling with configurable interval.
    *   Background zoom effect to prevent screen burn-in.
*   **Robust Favorites System:**
    *   Save/remove current background image.
    *   View, manage, and apply favorites from the control panel.
    *   Persistence via `localStorage`.
*   **Flexible Element Customization:**
    *   Adjust opacity, position (drag & drop), and scale for Clock and Date elements independently.
    *   Precise positioning system:
        *   Click to select element (invisible selection state) to drag
        *   Double Click to show white dashed outline
        *   Arrow keys to nudge by 0.1%
        *   Release Ctrl to hide outline
    *   Quick centering option for Clock and Date elements.
    *   Font selection and bold toggle for Clock and Date.
    *   Optional separator line for Clock and Date.
    *   Visual effects (Flat, Raised, Reflected).
*   **Configurable Date Display:** Toggle visibility and choose from various formats.
*   **Intuitive Controls:**
    *   Auto-hiding control panel organized by element (Background, Clock, Date, Favorites).
    *   Panel automatically hides when clicking anywhere on background.
    *   UI Builder pattern used for complex controls, separating concerns.
    *   Live preview for color picker.
    *   Clickable hint message for easy access.
    *   GitHub repository link in the app title.
*   **Keyboard Shortcuts:**
    *   `Double Click`: Select element for nudging
    *   `Ctrl + Arrow keys`: Nudge selected element by 0.1%
*   **Settings Persistence:** User customizations are saved using `localStorage`.
*   **Backend Proxy for APIs:** Simplifies setup by handling API keys server-side (using Vercel Serverless Functions defined in `/api`).
*   **Settings Import/Export:** Download your current settings (including element configurations and favorites) to a JSON file (named `ambient_clock_settings_YYYYMMDD.json`), and upload it later to restore your preferences.

## Live Demo

Vercel: https://ambient-clock.vercel.app/ 

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jcdrumm/ambientclock.git
    cd ambient-clock
    ```
2.  **Install dependencies:**
    *   Requires Node.js and npm.
    *   The backend API functions might use `axios`.
    ```bash
    npm install
    ```
3.  **Run locally:**
    *   For simple local viewing, open `index.html` directly in a modern web browser.
    *   **Important:** For the background image features (Unsplash, Pexels, Pixabay, Peapix) to work, you need to run the project using a local development server that can handle the API proxy routes defined in `vercel.json` and the `/api` directory. The recommended way is using the Vercel CLI:
        ```bash
        npm install -g vercel # Install Vercel CLI globally (if not already installed)
        vercel dev           # Start local development server
        ```
        This will typically start the server at `http://localhost:3000`. Access the clock at `http://localhost:3000/`.

*(Note: The backend proxy handles API keys, so no client-side keys are needed for local development when using `vercel dev`.)*

## Project Structure

The application follows a modular, component-based architecture:

```
/
├── index.html              # Main HTML entry point
├── css/                    # Styles (modularized)
│   ├── base/
│   ├── components/
│   ├── features/
│   └── layout/
├── js/                     # JavaScript
│   ├── app.js              # Main application setup
│   ├── core/               # Core modules (StateManager, EventBus, etc.)
│   ├── components/         # UI Components (Elements, Controls, Plugins)
│   │   ├── base/           # Base classes and mixins
│   │   ├── controls/       # Control panel sections (Background, Clock, etc.)
│   │   │   └── ui/         # UI Builder classes
│   │   ├── elements/       # Display elements (Clock, Date, etc.)
│   │   │   └── renderers/  # Clock face renderers
│   │   └── plugins/        # Reusable plugins (e.g., DragPlugin)
│   ├── managers/           # Higher-level managers (Elements, Controls)
│   ├── services/           # External services & handlers (Background, Favorites, API Providers)
│   │   ├── image-providers/ # Unsplash, Pexels, Pixabay, Peapix logic
│   │   └── storage/        # LocalStorage interaction
│   ├── state/              # Default state definition
│   └── utils/              # Utility functions
├── assets/                 # Icons, etc.
├── api/                    # Vercel Serverless Functions (Backend Proxy)
│   ├── unsplash.js
│   ├── pexels.js
│   ├── pixabay.js
│   └── peapix.js
├── cline_docs/             # Internal development documentation (Memory Bank)
├── tests/                  # Vitest unit/integration tests
├── .env.development.local  # Local environment variables (e.g., for API keys if needed directly)
├── .gitignore
├── package.json
├── package-lock.json
├── README.md               # This file
├── vitest.config.js        # Vitest configuration
└── vercel.json             # Vercel deployment/proxy configuration
```

## Key Architectural Patterns

*   **Component-Based:** UI is built from reusable custom elements (`BaseUIElement`).
*   **Centralized State:** `StateManager` provides a single source of truth with reactive updates.
*   **Event Bus:** `EventBus` facilitates decoupled communication between components.
*   **Services:** Dedicated services encapsulate logic for external interactions (APIs, `localStorage`).
*   **UI Builders:** Separate DOM creation logic from component event handling (`BackgroundUIBuilder`, `ClockControlsUIBuilder`, etc.).
*   **Renderers:** Delegate specific rendering tasks (e.g., clock faces) to dedicated classes.
*   **Plugins:** Encapsulate reusable behaviors like dragging (`DragPlugin`).
*   **Backend Proxy:** Serverless functions handle API interactions and key management.

## Keyboard Shortcuts

*   `Double Click`: Select element for nudging
*   `Ctrl + Arrow keys`: Nudge selected element by 0.1%

## Development

*   **Testing:** Run unit and integration tests using Vitest:
    ```bash
    npm test
    ```
*   **Linting:** JavaScript linting is configured via `eslint.config.mjs` and can typically be run via `npm run lint` (if defined in `package.json`) or integrated directly into your editor. CSS linting may require setup if needed.
*   **Debugging:** Add `?debug=true` to the URL (e.g., `http://localhost:3000/?debug=true`) to enable enhanced console logging via the `Logger` utility.

## License

GNU Affero General Public License (AGPL) v3
