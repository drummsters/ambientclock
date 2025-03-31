# Ambient Clock

A customizable ambient clock application with various display styles and background options.

## Features

- Multiple clock faces (Clean, Analog, LED)
- Customizable background images from Unsplash and Pexels
- Background zoom effect to prevent screen burn-in
- Robust favorites system to save and reuse background images
  - Add/remove current background to/from favorites
  - View and select from saved favorites in a visual grid
  - Automatic duplicate detection with URL normalization
  - Random inclusion of favorite images in background rotation (25% chance)
  - Favorites persistence via localStorage
- Adjustable clock and date opacity, position, and scale
- Auto-hiding controls panel with logical organization and visual hierarchy
- Clickable hint message for easy access to controls
- Settings persistence via localStorage
- API rate limit management for reliable performance

## Installation

1. Clone this repository
2. Set up the configuration:
   - Copy `js/config.example.js` to `js/config.js`
   - Get a free API key from [Unsplash Developer Portal](https://unsplash.com/developers)
   - Get a free API key from [Pexels API](https://www.pexels.com/api/)
   - Replace the placeholder API keys in `config.js` with your actual keys
   - Optionally set your preferred default image source ('unsplash' or 'pexels')
3. Open `index.html` in a modern web browser
4. No additional dependencies required

## Configuration

The clock can be customized through the controls panel, which is organized into logical sections:

**Clock Section:**
- **Clock Face**: Choose between Clean, Analog, or LED styles
- **Time Format**: Switch between 12-hour and 24-hour formats
- **Show Seconds**: Toggle seconds display
- **Clock Font**: Select from various font options
- **Bold**: Toggle bold text style
- **Clock Color**: Choose color for the clock (for Clean clock face)
- **Clock Size**: Adjust the scale of the clock display (0.08x to 3.0x)
- **Clock Opacity**: Adjust transparency of the clock face

**Date Section:**
- **Display Date**: Toggle date display on/off
- **Date Format**: Choose from various date formats
- **Date Color**: Select color for the date display
- **Date Size**: Adjust the scale of the date display (0.08x to 3.0x)
- **Date Opacity**: Adjust transparency of the date display

**Background Section:**
- **Image Source**: Select between Unsplash or Pexels for background images
- **Category**: Choose from preset categories or enter custom search terms
- **Opacity**: Control the opacity of the background overlay
- **Zoom Effect**: Toggle the slow zoom effect to prevent screen burn-in
- **Next Background**: Manually trigger a new background image
- **Favorites**: Save and manage favorite background images
  - Add current background to favorites
  - View and select from saved favorites
  - Favorites are randomly included in background rotation

**Effects Section:**
- **Style**: Select visual effects (Flat, Raised, Reflected)

**Settings Section:**
- **Reset All Settings**: Restore all settings to defaults

## Keyboard Shortcuts

- `Space` or `C`: Show/hide controls panel
- `N`: Load next background image
- `F`: Toggle current image as favorite

## Project Structure

The application follows a modular architecture for better maintainability and separation of concerns:

### Core Components

- **main.js**: Application entry point and initialization
- **state.js**: State management with pub/sub pattern for reactive updates
- **config.js**: Configuration settings and constants

### UI Components

- **components/**: UI components organized by functionality
  - **clock/**: Clock face implementations (Clean, Analog, LED)
  - **controls/**: Modular control panel implementation
    - **index.js**: Main coordinator for all control modules
    - **clock-controls.js**: Clock-specific controls
    - **date-controls.js**: Date-specific controls
    - **background-controls.js**: Background-specific controls
    - **global-controls.js**: Global settings controls
    - **visibility-controls.js**: Controls panel visibility management
  - **background.js**: Background image management
  - **date-display.js**: Date display component
  - **donate.js**: Donation widget component
  - **element-manager.js**: Base class for UI element management
  - **element.js**: Generic UI element component

### Features

- **features/**: Cross-cutting features and behaviors
  - **drag.js**: Drag functionality for UI elements
  - **effects.js**: Visual effects implementation
  - **element-drag.js**: Element-specific drag behavior
  - **element-position.js**: Element positioning and sizing
  - **keyboard.js**: Keyboard shortcuts
  - **position.js**: Position management utilities

### Services

- **services/**: External service integrations
  - **favorites.js**: Favorites management
  - **pexels.js**: Pexels API integration
  - **unsplash.js**: Unsplash API integration

### Utilities

- **utils/**: Utility functions and helpers
  - **debug.js**: Debugging utilities
  - **dom.js**: DOM manipulation helpers
  - **time.js**: Time formatting and management
  - **visibility.js**: Element visibility management
  - **wheel.js**: Mouse wheel event handling

## Size/Scale Controls

The application provides precise control over the size of both the clock and date displays:

- **Clock Size Slider**: Located in the Clock section of the controls panel
  - Range: 0.08x to 3.0x (8% to 300% of original size)
  - Step: 0.05 (5% increments)
  - Default: 1.4x (140% of original size)

- **Date Size Slider**: Located in the Date section of the controls panel
  - Range: 0.08x to 3.0x (8% to 300% of original size)
  - Step: 0.05 (5% increments)
  - Default: 1.0x (100% of original size)

These sliders allow users to fine-tune the appearance of the clock and date displays to match their preferences and screen size.

## Development and Debugging

The application includes a comprehensive debugging framework:

- **Debug Mode**: Add `?debug=true` to the URL to enable debug mode
- **Console Commands**:
  - `ambientClock.clearLocalStorage()` - Clear saved settings
  - `ambientClock.resetAndReload()` - Reset settings and reload
  - `ambientClock.toggleDebugMode()` - Toggle debug mode

When debug mode is enabled:
- Visual indicators show timer operations and hover states
- Color-coded console logging provides detailed information
- Interactive elements are highlighted when hovered
- State transitions are visually indicated

This framework is built on core debugging principles documented in `cline_docs/`.

## License

GNU Affero General Public License (AGPL) v3
