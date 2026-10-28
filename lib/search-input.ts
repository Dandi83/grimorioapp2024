/**
 * The attributes of every search field of the site (public and reserved area). Safari on iPhone took the fields for
 * an address and offered «Inserisci info» and the saved addresses over the keyboard (28 October 2026):
 * - type and enterKeyHint "search": the keyboard shows «Cerca»;
 * - autocomplete, autocorrect, autocapitalize and spellcheck off: nothing is filled in or changed while typing;
 * - a name with "search" in it and no id: Safari's AutoFill treats such a field as a search field and leaves it
 *   alone (a field named or labelled like an address or a contact is what triggers the suggestions);
 * - the password managers' own marks (1Password, LastPass, Dashlane) so they offer nothing either.
 * No field is inside a <form>, so no other field nearby can make Safari read it as part of an address.
 */
export const SEARCH_INPUT = {
  type: "search",
  name: "grimorio-search",
  enterKeyHint: "search",
  inputMode: "search",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
  "data-1p-ignore": "",
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;
