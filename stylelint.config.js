/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Add any project-specific overrides here
    'property-no-vendor-prefix': null, // Allow vendor prefixes
    'property-no-unknown': [
      true,
      {
        ignoreProperties: ['user-drag'], // Allow specific unknown properties
      },
    ],
    'declaration-property-value-no-unknown': null, // Allow unknown values for properties
    'no-descending-specificity': null, // Allow descending specificity
    'keyframes-name-pattern': null, // Allow any keyframe name pattern
    'value-keyword-case': null, // Allow any case for keywords like font names
    'comment-empty-line-before': null, // Allow comments without preceding empty lines (often auto-fixable but numerous)
    'alpha-value-notation': null, // Allow different alpha notations (e.g., 0.5 vs 50%)
    'color-function-notation': null, // Allow legacy color functions (rgba())
    'color-hex-length': null, // Allow long hex codes (#FFFFFF)
    'length-zero-no-unit': null, // Allow units for zero lengths (0px)
    'shorthand-property-no-redundant-values': null, // Allow redundant shorthand values
    'no-duplicate-selectors': null, // Allow duplicate selectors (might indicate refactoring need later)
    'rule-empty-line-before': null, // Allow rules without preceding empty lines
  },
};
