# Ambient Clock

A customizable ambient clock application with various display styles and background options.

## Features

- Multiple clock faces (Clean, Analog, LED)
- Customizable background images from Unsplash and Pexels
- Background zoom effect to prevent screen burn-in
- Adjustable clock opacity and position
- Keyboard shortcuts for quick adjustments
- Auto-hiding controls panel with helpful hints
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

The clock can be customized through the controls panel:

- **Clock Face**: Choose between Clean, Analog, or LED styles
- **Style**: Select visual effects (Flat, Raised, Reflected)
- **Image Source**: Select between Unsplash or Pexels for background images
- **Background**: Choose from preset categories or enter custom search terms
- **Clock Opacity**: Adjust transparency of the clock face
- **Font**: Select from various font options and toggle bold style
- **Time Format**: Switch between 12-hour and 24-hour formats
- **Show Seconds**: Toggle seconds display
- **Background Zoom**: Toggle the slow zoom effect to prevent screen burn-in
- **Reset All Settings**: Restore all settings to defaults

## Keyboard Shortcuts

- `+`/`-`: Adjust background dimness
- `Space` or `C`: Show/hide controls panel
- Arrow keys: Move clock position
- `Ctrl` + `+`/`-`: Adjust clock size


## License

GNU Affero General Public License (AGPL) v3
