import next from "eslint-config-next";

// eslint-config-next 16 ships a native flat config array; legacy .eslintrc and
// FlatCompat both trip on its circular plugin refs, so import it directly.
export default [...next, { ignores: [".next/**", "node_modules/**"] }];
