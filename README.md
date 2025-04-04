# Ambient Clock V2

A highly customizable ambient clock application featuring multiple display styles, dynamic backgrounds, and a modern architecture. This project has been significantly refactored (V2) for improved maintainability, scalability, and user experience.

## V2 Features

*   **Modern Architecture:** Refactored using ES Modules, component-based structure, centralized state management (`StateManager`), and event bus (`EventBus`).
*   **Multiple Clock Faces:**
    *   Clean/LED (Digital)
    *   Analog (Rendered with SVG for crisp scaling)
*   **Customizable Backgrounds:**
    *   Image providers: Unsplash, Pexels (via backend proxy - no client API keys needed!)
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
        *   Click to select element (invisible selection state)
        *   Hold Ctrl to show white dashed outline
        *   Use Ctrl + Arrow keys to nudge by 0.1%
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
*   **Keyboard Shortcuts:**
    *   Space/C: Show/hide controls panel
    *   N: Load next background image
    *   F: Toggle current image as favorite
    *   Ctrl + Arrow keys: Nudge selected element in small increments
*   **Settings Persistence:** User customizations are saved using `localStorage`.
*   **Backend Proxy for APIs:** Simplifies setup by handling API keys server-side (using Vercel Serverless Functions defined in `/api`).

## Live Demo

*(Link to live deployment if available - e.g., Vercel)*

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    *   Requires Node.js and npm.
    *   The backend API functions might use `axios`.
    ```bash
    npm install
    ```
3.  **Run locally:**
    *   For simple local viewing, open `v2/index.html` directly in a modern web browser.
    *   **Important:** For the background image features (Unsplash/Pexels) to work, you need to run the project using a local development server that can handle the API proxy routes defined in `vercel.json` and the `/api` directory. The recommended way is using the Vercel CLI:
        ```bash
        npm install -g vercel # Install Vercel CLI globally (if not already installed)
        vercel dev           # Start local development server
        ```
        This will typically start the server at `http://localhost:3000`. Access the V2 clock via `http://localhost:3000/v2/`.

*(Note: If API keys are needed for the Vercel deployment environment variables, add instructions here on how to obtain and set them up in Vercel.)*

## Project Structure (V2 Focus)

The V2 application resides primarily within the `/v2` directory and follows a modular, component-based architecture:

```
/
├── v2/
│   ├── index.html          # Entry point for V2
│   ├── css/                # V2 Styles (modularized)
│   │   ├── base/
│   │   ├── components/
│   │   ├── features/
│   │   └── layout/
│   ├── js/                 # V2 JavaScript
│   │   ├── app.js            # Main application setup
│   │   ├── core/             # Core modules (StateManager, EventBus, etc.)
│   │   ├── components/       # UI Components (Elements, Controls, Plugins)
│   │   │   ├── base/         # Base classes and mixins
│   │   │   ├── controls/     # Control panel sections (Background, Clock, etc.)
│   │   │   │   └── ui/       # UI Builder classes
│   │   │   ├── elements/     # Display elements (Clock, Date, etc.)
│   │   │   │   └── renderers/ # Clock face renderers
│   │   │   └── plugins/      # Reusable plugins (e.g., DragPlugin)
│   │   ├── managers/         # Higher-level managers (Elements, Controls)
│   │   ├── services/         # External services & handlers (Background, Favorites, API Providers)
│   │   │   ├── image-providers/ # Unsplash, Pexels logic
│   │   │   └── storage/      # LocalStorage interaction
│   │   ├── state/            # Default state definition
│   │   └── utils/            # Utility functions
│   └── assets/             # Icons, etc.
├── api/                    # Vercel Serverless Functions (Backend Proxy)
│   ├── unsplash.js
│   └── pexels.js
├── cline_docs/             # Internal development documentation (Memory Bank)
├── .gitignore
├── package.json
├── README.md               # This file
├── stylelint.config.js     # CSS linting config
├── eslint.config.mjs       # JS linting config
└── vercel.json             # Vercel deployment/proxy configuration
```

## Key V2 Architectural Patterns

*   **Component-Based:** UI is built from reusable custom elements (`BaseUIElement`).
*   **Centralized State:** `StateManager` provides a single source of truth with reactive updates.
*   **Event Bus:** `EventBus` facilitates decoupled communication between components.
*   **Services:** Dedicated services encapsulate logic for external interactions (APIs, `localStorage`).
*   **UI Builders:** Separate DOM creation logic from component event handling (`BackgroundUIBuilder`, `ClockControlsUIBuilder`, etc.).
*   **Renderers:** Delegate specific rendering tasks (e.g., clock faces) to dedicated classes.
*   **Plugins:** Encapsulate reusable behaviors like dragging (`DragPlugin`).
*   **Backend Proxy:** Serverless functions handle API interactions and key management.

## Keyboard Shortcuts (V2)

*   `Space` or `C`: Show/hide controls panel
*   `N`: Load next background image (if applicable)
*   `F`: Toggle current image as favorite (if applicable)
*   `Ctrl`: Show outline on selected element
*   `Ctrl + Arrow keys`: Nudge selected element by 0.1%

## Development

*   **Linting:** Run `npm run lint:css` for CSS linting. JS linting is likely integrated with the editor via `eslint.config.mjs`.
*   **Debugging:** Add `?debug=true` to the URL (`v2/index.html?debug=true`) to enable enhanced console logging via the `Logger` utility.

## License

GNU Affero General Public License (AGPL) v3
