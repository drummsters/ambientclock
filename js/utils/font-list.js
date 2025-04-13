/**
 * Consolidated list of available fonts, including Google Fonts and standard system fonts.
 */
export const AVAILABLE_FONTS = [
    // Google Fonts (from index.html)
    'Abril Fatface',
    'Anton',
    'Bangers',
    'Bebas Neue',
    'Black Ops One',
    'Cabin Sketch',
    'Caveat',
    'Corben',
    'Damion',
    'Dancing Script',
    'Darker Grotesque',
    'Exo',
    'Fredericka the Great',
    'Fugaz One',
    'Indie Flower',
    'Libre Baskerville',
    'Lilita One',
    'Limelight',
    'Lobster',
    'Lora',
    'Merriweather',
    'Michroma',
    'Montserrat',
    'Noto Serif', // Note: Noto Sans was in the old list but not imported
    'Nunito',
    'Open Sans',
    'Oswald',
    'Pacifico',
    'Permanent Marker',
    'Playfair Display',
    'Press Start 2P',
    'Prosto One',
    'Quicksand',
    'Raleway',
    'Roboto Slab',
    'Roboto',
    'Rye',
    'Satisfy',
    'Schoolbell',
    'Shadows Into Light',
    'Share Tech Mono',
    'Sixtyfour',
    'Special Elite',
    'Wallpoet',
    'Zilla Slab Highlight',

    // Common System Sans-serif
    'Arial',
    'Helvetica',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Geneva',
    'Lucida Sans Unicode',
    'Lucida Grande',
    'Segoe UI',
    'Candara',
    'Calibri',
    'Optima',
    'Gill Sans',
    'Avant Garde',
    'Futura',
    'Century Gothic',
    'Apple System', // Added from old list
    'System UI', // Added from old list
    'Impact', // Added from old list
    'Lato', // Added from old list (popular, often system/browser default)
    'Poppins', // Added from old list (popular)

    // Common System Serif
    'Times New Roman',
    'Georgia',
    'Garamond',
    'Palatino Linotype',
    'Book Antiqua',
    'Didot',
    'Bodoni MT',
    'Hoefler Text',
    'Cambria',
    'Constantia',
    'Serif', // Generic

    // Common System Monospace
    'Courier New',
    'Lucida Console',
    'Monaco',
    'Consolas',
    'Andale Mono',
    'Menlo',
    'Source Code Pro', // Often installed with dev tools
    'Monospace', // Generic

    // Common System Script/Display
    'Brush Script MT',
    'Comic Sans MS', // Added from old list
    'Cursive', // Generic
    'Fantasy', // Generic
    'VT323', // Added from old list

].sort((a, b) => a.localeCompare(b)); // Sort alphabetically
