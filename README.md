# Ambient Clock

A customizable ambient clock application with various display styles and background options.

## Features

- Multiple clock faces (Clean, Analog, LED)
- Customizable background images from Unsplash and Pexels
- Background zoom effect to prevent screen burn-in
- Adjustable clock opacity and position
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
- **Clock Opacity**: Adjust transparency of the clock face

**Date Section:**
- **Display Date**: Toggle date display on/off
- **Date Format**: Choose from various date formats
- **Date Color**: Select color for the date display
- **Date Opacity**: Adjust transparency of the date display

**Background Section:**
- **Image Source**: Select between Unsplash or Pexels for background images
- **Category**: Choose from preset categories or enter custom search terms
- **Opacity**: Control the opacity of the background overlay
- **Zoom Effect**: Toggle the slow zoom effect to prevent screen burn-in
- **Next Background**: Manually trigger a new background image

**Effects Section:**
- **Style**: Select visual effects (Flat, Raised, Reflected)

**Settings Section:**
- **Reset All Settings**: Restore all settings to defaults

## Keyboard Shortcuts

- `Space` or `C`: Show/hide controls panel


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
